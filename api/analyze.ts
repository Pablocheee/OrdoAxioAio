import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается (Method not allowed)' });
  }

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.VITE_FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.VITE_FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
  const geminiApiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return res.status(500).json({ error: 'Ошибка сервера: Отсутствуют ключи конфигурации Firebase Admin' });
  }

  if (!geminiApiKey) {
    return res.status(500).json({ error: 'Ошибка сервера: Отсутствует ключ конфигурации GEMINI_API_KEY' });
  }

  try {
    // Инициализируем Firebase Admin SDK, если он еще не инициализирован
    if (!getApps().length) {
      let formattedKey = privateKey.trim();
      if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
        formattedKey = formattedKey.slice(1, -1);
      }
      formattedKey = formattedKey.replace(/\\n/g, '\n');

      initializeApp({
        credential: cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: formattedKey,
        }),
      });
    }

    const db = getFirestore();
    const genAI = new GoogleGenerativeAI(geminiApiKey);

    const targetProjectId = req.body.projectId;
    
    if (!targetProjectId) {
      return res.status(400).json({ error: 'Missing projectId' });
    }

    // 1. Получаем сырые данные с сайта клиента из коллекции raw_client_data
    const rawDataSnapshot = await db.collection('raw_client_data').where('projectId', '==', targetProjectId).limit(1).get();
    
    if (rawDataSnapshot.empty) {
      return res.status(404).json({ error: 'Сырые данные не найдены' });
    }

    const rawData = rawDataSnapshot.docs[0].data().data;

    // 2. Конструируем промпт для Gemini 1.5 Pro
    const prompt = `
      Вы — опытный SEO-инженер и архитектор данных. Проанализируйте следующие спарсенные данные с сайта клиента.
      Определите основную тематику, структуру (по H1, H2, H3) и суть их предложений.
      
      Данные сайта:
      Title: ${rawData.title || 'Нет'}
      Description: ${rawData.description || 'Нет'}
      H1: ${rawData.h1?.join(', ') || 'Нет'}
      H2: ${rawData.h2?.join(', ') || 'Нет'}
      H3: ${rawData.h3?.join(', ') || 'Нет'}

      Сформируйте структурированный аналитический отчет (до 1500 символов). Выделите сильные стороны и найдите "Data Voids" (слепые зоны) — низкоконкурентные запросы, на которые сайту стоит дать машиночитаемые ответы для поисковиков и ИИ-агентов.
    `;

    // 3. Отправляем запрос к модели Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result = await model.generateContent(prompt);
    const aiReport = result.response.text();

    // 4. Сохраняем результат анализа в отдельную коллекцию ai_analysis
    await db.collection('ai_analysis').add({
      projectId: targetProjectId,
      report: aiReport,
      createdAt: new Date().toISOString()
    });

    // 5. Обновляем статус основного проекта
    await db.collection('projects').doc(targetProjectId).update({
      status: 'completed',
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ success: true, report: aiReport });
  } catch (error: any) {
    console.error('Ошибка анализа Gemini:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || error.toString(),
      stack: error.stack 
    });
  }
}
