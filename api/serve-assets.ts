import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Инициализация Firebase Admin SDK (безопасно для serverless среды Vercel, защита от холодных стартов)
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
 * Обработчик отдачи сгенерированных AI-ресурсов (JSON-LD и семантический HTML)
 * для клиентских сайтов через внедренный JS-скрипт.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Извлечение параметров url и clientId из GET-запроса
    const { url, clientId } = req.query;

    if (!url || !clientId || typeof url !== 'string' || typeof clientId !== 'string') {
      return res.status(400).json({ error: 'Неверные или отсутствующие параметры запроса (url, clientId)' });
    }

    // 2. Безопасность: Извлечение заголовка Origin (или Referer как запасной вариант)
    const originHeader = req.headers.origin || req.headers.referer;
    if (!originHeader) {
      return res.status(403).json({ error: 'Доступ запрещен: Отсутствует заголовок Origin или Referer' });
    }

    let requestHost = '';
    try {
      requestHost = new URL(originHeader).hostname;
    } catch (e) {
      return res.status(403).json({ error: 'Доступ запрещен: Некорректный заголовок Origin' });
    }

    // Запрос к Firestore для проверки валидности клиента
    const clientDoc = await db.collection('clients').doc(clientId).get();
    if (!clientDoc.exists) {
      return res.status(403).json({ error: 'Доступ запрещен: Клиент не найден' });
    }

    const clientData = clientDoc.data();
    const registeredDomain = clientData?.domain || '';
    
    // Нормализация зарегистрированного домена (отсекаем протокол и пути, если они были сохранены)
    const expectedHost = registeredDomain.replace(/^https?:\/\//, '').split('/')[0];

    // Сравнение фактического хоста запроса с зарегистрированным доменом
    if (requestHost !== expectedHost) {
      return res.status(403).json({ error: 'Доступ запрещен: Домен не авторизован' });
    }

    // Устанавливаем динамические CORS-заголовки строго для авторизованного домена
    const corsOrigin = req.headers.origin ? req.headers.origin : `https://${expectedHost}`;
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    // Обработка preflight-запросов (CORS OPTIONS)
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Проверяем, разрешен ли метод (только GET)
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Метод не поддерживается, разрешен только GET' });
    }

    // 3. Проверка флага включенной маршрутизации / выдачи ассетов (согласно бизнес-логике)
    if (clientData?.features?.isAiRoutingEnabled === false) {
      return res.status(204).end(); // No Content (пустой успешный ответ без данных)
    }

    // 4. Поиск оптимизированных данных в коллекции optimized_assets
    const assetsSnapshot = await db.collection('optimized_assets')
      .where('clientId', '==', clientId)
      .where('url', '==', url)
      .limit(1)
      .get();

    if (assetsSnapshot.empty) {
      return res.status(404).json({ error: 'Оптимизированные данные не найдены для указанного URL' });
    }

    const assetData = assetsSnapshot.docs[0].data();

    // 5. Установка строгих заголовков кэширования для Edge Network (CDN) и браузера
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    
    // 6. Отдача целевого JSON-пайлоада (200 OK)
    return res.status(200).json({
      jsonLd: assetData.jsonLd || null,
      semanticHtmlBlock: assetData.semanticHtmlBlock || ''
    });

  } catch (error: any) {
    // В случае сбоя логируем ошибку, чтобы она была видна в консоли Vercel
    console.error('Ошибка в эндпоинте serve-assets:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при выдаче AI-ресурсов' });
  }
}
