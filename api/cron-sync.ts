import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { parseHtmlContent, generateContentHash } from '../src/utils/parser.js';

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

/**
 * Получает список целевых URL-адресов клиента из Firestore.
 * 
 * @param clientId Идентификатор клиента
 * @returns Массив целевых URL
 */
async function getTargetUrlsForClient(clientId: string): Promise<string[]> {
  try {
    const clientDoc = await db.collection('clients').doc(clientId).get();
    
    if (!clientDoc.exists) {
      console.warn(`[Warning] Клиент ${clientId} не найден в базе.`);
      return [];
    }
    
    const clientData = clientDoc.data();
    
    // Подтягиваем массив ссылок (предполагается, что поле называется targetUrls)
    const urls: string[] = clientData?.targetUrls || [];
    
    // Возвращаем только валидные ссылки, отсекая возможные пустые строки
    return urls.filter((url: string) => typeof url === 'string' && url.startsWith('http'));
    
  } catch (error: any) {
    console.error(`[Error] Ошибка при чтении ссылок для клиента ${clientId}:`, error.message);
    return [];
  }
}

/**
 * Разбивает массив на чанки (партии) заданного размера для параллельной обработки.
 * Помогает избежать превышения лимитов памяти и тайм-аутов.
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Основной обработчик Cron-задачи для Vercel.
 * Выполняет фоновую синхронизацию, скачивание, парсинг и проверку обновлений контента.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Получаем активных клиентов, у которых включен парсинг (isParserEnabled === true)
    const clientsSnapshot = await db.collection('clients')
      .where('features.isParserEnabled', '==', true)
      .get();

    if (clientsSnapshot.empty) {
      return res.status(200).json({ message: 'Нет активных клиентов для синхронизации.' });
    }

    const results: any[] = [];

    // 2. Итерируемся по каждому активному клиенту
    for (const clientDoc of clientsSnapshot.docs) {
      const clientId = clientDoc.id;
      const clientData = clientDoc.data();
      const businessType = clientData.businessType || 'services';

      // 3. Получаем целевые URL для текущего клиента
      const urls = await getTargetUrlsForClient(clientId);
      
      // Разбиваем URL-адреса на пачки по 5 штук для контролируемого параллелизма
      const chunks = chunkArray(urls, 5);

      for (const chunk of chunks) {
        // Формируем массив промисов для текущей пачки
        const chunkPromises = chunk.map(async (url) => {
          try {
            // 4. Скачиваем HTML страницы
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Сетевая ошибка: ${response.status} ${response.statusText}`);
            }
            const html = await response.text();

            // 5. Парсим контент и генерируем хеш
            const parsedData = parseHtmlContent(html, businessType);
            const contentHash = generateContentHash(parsedData);

            // 6. Проверяем существование записи в коллекции catalog_items
            const itemsSnapshot = await db.collection('catalog_items')
              .where('clientId', '==', clientId)
              .where('url', '==', url)
              .limit(1)
              .get();

            let shouldUpdate = false;
            let docRef;

            if (itemsSnapshot.empty) {
              shouldUpdate = true;
              docRef = db.collection('catalog_items').doc();
            } else {
              const existingDoc = itemsSnapshot.docs[0];
              docRef = existingDoc.ref;
              // Если хеш контента отличается от сохраненного, требуется обновление
              if (existingDoc.data().content_hash !== contentHash) {
                shouldUpdate = true;
              }
            }

            if (shouldUpdate) {
              // Сохраняем/обновляем спарсенные данные и ставим флаг для дальнейшей обработки ИИ
              await docRef.set({
                clientId,
                url,
                raw_data: parsedData,
                content_hash: contentHash,
                needs_ai_processing: true,
                updatedAt: new Date().toISOString()
              }, { merge: true });
              
              return { url, status: 'updated' };
            }

            // Хеш совпал — пропускаем запись в базу (экономия квот Firestore)
            return { url, status: 'skipped' };
          } catch (err: any) {
            // Грациозная обработка ошибки одиночного URL: логируем и продолжаем работу
            console.error(`Ошибка при обработке URL ${url} для клиента ${clientId}:`, err.message);
            return { url, status: 'error', error: err.message };
          }
        });

        // Используем Promise.allSettled для безопасного выполнения всей пачки
        const settled = await Promise.allSettled(chunkPromises);
        
        settled.forEach(outcome => {
          if (outcome.status === 'fulfilled') {
            results.push(outcome.value);
          } else {
            results.push({ status: 'unhandled_rejection', reason: outcome.reason });
          }
        });
      }
    }

    return res.status(200).json({ success: true, processed: results });
  } catch (error: any) {
    console.error('Критическая ошибка синхронизации (Cron):', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
