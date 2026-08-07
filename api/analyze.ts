import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenAI, Type } from '@google/genai';

// Инициализация Firebase Admin SDK (безопасно для serverless среды Vercel)
if (!getApps().length) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.VITE_FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.VITE_FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    let formattedKey = privateKey.trim();
    if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
      formattedKey = formattedKey.slice(1, -1);
    }
    formattedKey = formattedKey.replace(/\\n/g, '\n');

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });
  } else {
    console.error('Ошибка: Отсутствуют переменные окружения для Firebase Admin SDK.');
  }
}

const db = getFirestore();
const geminiApiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: geminiApiKey || '' });

/**
 * Вызов Google Gemini с механизмом экспоненциальной задержки при лимитах (429) или недоступности (503).
 */
async function generateWithRetry(systemInstruction: string, rawData: any, retries = 3): Promise<any> {
  const prompt = `${systemInstruction}\n\nДанные для анализа:\n${JSON.stringify(rawData, null, 2)}`;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              jsonLd: {
                type: Type.OBJECT,
                description: 'Сгенерированный объект семантической разметки JSON-LD (включая @context, @type и т.д.)'
              },
              semanticHtmlBlock: {
                type: Type.STRING,
                description: 'HTML блок, содержащий экспертный FAQ или дополнительный контекст (Data Voids).'
              }
            },
            required: ['jsonLd', 'semanticHtmlBlock']
          }
        }
      });
      
      const responseText = response.text;
      if (!responseText) throw new Error('Пустой ответ от Gemini API');
      
      return JSON.parse(responseText);
    } catch (error: any) {
      // Проверка на коды 429 (Too Many Requests) и 503 (Service Unavailable)
      const isRetryable = error?.status === 429 || error?.status === 503 || 
                          error?.message?.includes('429') || error?.message?.includes('503');
      
      if (isRetryable && i < retries - 1) {
        const delay = Math.pow(2, i + 1) * 1000; // Экспоненциальная задержка: 2s, 4s, 8s...
        console.warn(`[Gemini API] Ошибка ${error.status || 'сети'}. Повторная попытка через ${delay}мс...`);
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Превышено количество попыток запроса к Gemini API');
}

/**
 * Основной обработчик: пакетный анализ данных из catalog_items с помощью Gemini API.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (!geminiApiKey) {
    return res.status(500).json({ error: 'Ключ GEMINI_API_KEY не настроен' });
  }

  try {
    // 1. Извлекаем до 10 записей, ожидающих обработки ИИ
    const catalogRef = db.collection('catalog_items');
    const snapshot = await catalogRef
      .where('needs_ai_processing', '==', true)
      .limit(10)
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ success: true, message: 'Нет данных для AI обработки' });
    }

    const batch = db.batch();
    const results: any[] = [];
    const clientCache = new Map<string, any>(); // Кэширование клиентов для уменьшения чтений из БД

    // 2. Обработка каждой записи
    for (const doc of snapshot.docs) {
      const itemData = doc.data();
      const clientId = itemData.clientId;
      const itemId = doc.id;

      try {
        // 3. Проверка настроек клиента
        let clientData = clientCache.get(clientId);
        if (!clientData) {
          const clientDoc = await db.collection('clients').doc(clientId).get();
          if (clientDoc.exists) {
            clientData = clientDoc.data();
            clientCache.set(clientId, clientData);
          }
        }

        if (!clientData || clientData.features?.isAiGenerationEnabled === false) {
          console.log(`[Skipping] Клиент ${clientId} отключил AI-генерацию. Пропуск item ${itemId}.`);
          batch.update(doc.ref, { needs_ai_processing: false });
          results.push({ itemId, status: 'skipped_by_client_settings' });
          continue;
        }

        // 4. Генерация контента через Gemini API
        const systemPrompt = `
          Вы — ведущий эксперт по SEO (Search Engine Optimization) и AIO (AI Search Optimization).
          Ваша задача проанализировать сырые данные веб-страницы и вернуть строго структурированный JSON.
          
          Инструкции:
          1. jsonLd: Сгенерируйте глубокую и релевантную семантическую разметку Schema.org (JSON-LD), подходящую для данного контента. Обязательно включите узлы, полезные для AI-агентов (например, FAQPage, Product, Article).
          2. semanticHtmlBlock: Напишите экспертный HTML-блок (используя теги <details>, <summary>, <section>, <h2>, <h3>, <p>). Выявите "Data Voids" (информационные пробелы) из предоставленных данных и напишите ответы на редкие, но важные вопросы, которые ИИ-поисковики (ChatGPT, Perplexity) ищут, но не находят. Контент должен быть готов к вставке на страницу.

          Верните ТОЛЬКО валидный JSON без маркдаун-оберток.
        `;

        console.log(`[Processing] Запуск AI генерации для item ${itemId}...`);
        const generatedPayload = await generateWithRetry(systemPrompt, itemData.raw_data || {});

        // 5. Обновление базы данных (Firestore Batch)
        const optimizedAssetRef = db.collection('optimized_assets').doc();
        batch.set(optimizedAssetRef, {
          clientId,
          catalogItemId: itemId,
          url: itemData.url || '',
          jsonLd: generatedPayload.jsonLd,
          semanticHtmlBlock: generatedPayload.semanticHtmlBlock,
          timestamp: new Date().toISOString()
        });

        batch.update(doc.ref, { needs_ai_processing: false });
        results.push({ itemId, status: 'success', assetId: optimizedAssetRef.id });

      } catch (itemError: any) {
        // 6. Изолированная обработка ошибок для каждого документа (предотвращает падение всего батча)
        console.error(`[Error] Ошибка обработки item ${itemId}:`, itemError.message);
        results.push({ itemId, status: 'error', error: itemError.message });
      }
    }

    // Применяем все успешные и пропущенные обновления за один запрос
    await batch.commit();

    return res.status(200).json({ success: true, processed: results.length, results });

  } catch (error: any) {
    console.error('Критическая ошибка пайплайна AI генерации:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
