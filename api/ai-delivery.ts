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
 * Обработчик для отдачи оптимизированного контента AI-ботам.
 * 1. Получает оригинальный путь и хост.
 * 2. Ищет оптимизированные данные (JSON-LD и семантический HTML) в Firestore.
 * 3. Возвращает чистый HTML с разметкой для ИИ.
 * 4. Если данных нет, проксирует (fallback) оригинальный запрос на сайт клиента.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Извлекаем путь и хост (передаются из middleware или берутся из заголовков)
    const { path, host: queryHost } = req.query;
    
    // Определяем оригинальный хост. Fallback на заголовок host, если не передан в query параметрах.
    const host = queryHost || req.headers['x-forwarded-host'] || req.headers.host;
    
    if (!path || !host) {
      return res.status(400).json({ error: 'Недостаточно параметров для формирования оригинального URL (Missing path or host)' });
    }

    // Восстанавливаем полный оригинальный URL
    const proto = req.headers['x-forwarded-proto'] || 'https';
    // Проверяем, начинается ли путь с '/', чтобы избежать двойных слэшей или слитного URL
    const formattedPath = (path as string).startsWith('/') ? path : `/${path}`;
    const targetUrl = `${proto}://${host}${formattedPath}`;

    // 2. Ищем оптимизированные данные в коллекции optimized_assets в Firestore
    const assetsSnapshot = await db.collection('optimized_assets')
      .where('url', '==', targetUrl)
      .limit(1)
      .get();

    // 3. Если данные НАЙДЕНЫ, собираем и возвращаем минималистичный семантический HTML
    if (!assetsSnapshot.empty) {
      const assetData = assetsSnapshot.docs[0].data();
      
      const jsonLdString = JSON.stringify(assetData.jsonLd || {});
      const semanticHtmlBlock = assetData.semanticHtmlBlock || '';

      const htmlDocument = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Optimized Content</title>
    <script type="application/ld+json">
${jsonLdString}
    </script>
</head>
<body>
${semanticHtmlBlock}
</body>
</html>`;

      // Устанавливаем строгие заголовки кэширования для минимизации чтений из БД
      // public, max-age=3600 (1 час кэша браузера/бота), s-maxage=86400 (24 часа на уровне Vercel Edge Network)
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      
      return res.status(200).send(htmlDocument);
    }

    // 4. Если данные НЕ НАЙДЕНЫ — работает как прозрачный прокси (Fallback)
    console.log(`[AI-Delivery Fallback] Оптимизированные данные не найдены, выполняем проксирование к: ${targetUrl}`);
    const fallbackResponse = await fetch(targetUrl, {
      // Передаем User-Agent оригинального бота для корректного отображения и избежания блокировок
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (compatible; AIO-Fallback-Proxy/1.0)'
      }
    });

    if (!fallbackResponse.ok) {
      throw new Error(`Fallback запрос завершился с ошибкой: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
    }

    const fallbackHtml = await fallbackResponse.text();
    
    // Возвращаем оригинальный контент без длительного кэширования
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    return res.status(200).send(fallbackHtml);

  } catch (error: any) {
    // 5. Обработка ошибок (например, сбой fallback fetch запроса)
    console.error('Ошибка в эндпоинте AI доставки:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при обработке AI-запроса', details: error.message });
  }
}
