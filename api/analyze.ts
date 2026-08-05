import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Инициализируем Firebase Admin SDK, если он еще не инициализирован
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Заменяем экранированные переносы строк, если они пришли из Vercel Environment Variables
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Missing projectId' });
    }

    // 1. Получаем сырые данные с сайта клиента из коллекции raw_client_data
    const rawDataSnapshot = await db.collection('raw_client_data').where('projectId', '==', projectId).limit(1).get();
    
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

    // 3. Отправляем запрос к модели Gemini 1.5 Pro
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(prompt);
    const aiReport = result.response.text();

    // 4. Сохраняем результат анализа в отдельную коллекцию ai_analysis
    await db.collection('ai_analysis').add({
      projectId,
      report: aiReport,
      createdAt: new Date().toISOString()
    });

    // 5. Обновляем статус основного проекта
    await db.collection('projects').doc(projectId).update({
      status: 'completed',
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ success: true, report: aiReport });
  } catch (error: any) {
    console.error('Ошибка анализа Gemini:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
