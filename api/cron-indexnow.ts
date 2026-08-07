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
 * Крон-задача (Cron Job) для пакетной отправки URL-адресов в поисковые системы (Bing, Yandex)
 * по протоколу IndexNow. Вызывается по расписанию через Vercel Cron.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Извлечение до 500 записей для предотвращения таймаутов serverless функции и лимитов batch-запроса Firestore
    const assetsSnapshot = await db.collection('optimized_assets')
      .where('needs_indexnow_ping', '==', true)
      .limit(500)
      .get();

    if (assetsSnapshot.empty) {
      return res.status(200).json({ success: true, message: 'Нет новых URL для пинга IndexNow.' });
    }

    // 2. Группировка URL-адресов по клиентам (clientId)
    const groupedAssets = new Map<string, { docRefs: FirebaseFirestore.DocumentReference[], urls: string[] }>();

    assetsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const clientId = data.clientId;
      const url = data.url;

      if (clientId && url) {
        if (!groupedAssets.has(clientId)) {
          groupedAssets.set(clientId, { docRefs: [], urls: [] });
        }
        const group = groupedAssets.get(clientId)!;
        group.docRefs.push(doc.ref);
        group.urls.push(url);
      }
    });

    const batch = db.batch();
    const results: any[] = [];

    // 3. Обработка каждой группы (клиента) отдельно
    for (const [clientId, group] of groupedAssets.entries()) {
      try {
        // Проверка настроек клиента
        const clientDoc = await db.collection('clients').doc(clientId).get();
        if (!clientDoc.exists) {
          console.warn(`[IndexNow] Клиент ${clientId} не найден. Пропуск пакета.`);
          results.push({ clientId, status: 'skipped', reason: 'client_not_found' });
          continue;
        }

        const clientData = clientDoc.data();
        
        // Проверяем включена ли быстрая индексация и есть ли ключ IndexNow
        if (clientData?.features?.isFastIndexingEnabled !== true || !clientData?.indexnow_key) {
          console.warn(`[IndexNow] Для клиента ${clientId} отключена быстрая индексация или отсутствует ключ. Пропуск.`);
          results.push({ clientId, status: 'skipped', reason: 'feature_disabled_or_missing_key' });
          continue;
        }

        const indexNowKey = clientData.indexnow_key;
        const registeredDomain = clientData.domain || '';
        
        // Извлекаем чистый хост из домена клиента
        let host = registeredDomain;
        if (host.startsWith('http')) {
          host = new URL(host).hostname;
        }

        if (!host) {
          console.warn(`[IndexNow] Не удалось определить хост для клиента ${clientId}. Пропуск.`);
          results.push({ clientId, status: 'skipped', reason: 'invalid_host' });
          continue;
        }

        // 4. Формирование Payload для API IndexNow
        const payload = {
          host: host,
          key: indexNowKey,
          keyLocation: \`https://\${host}/\${indexNowKey}.txt\`,
          urlList: group.urls
        };

        // 5. Отправка POST-запроса в IndexNow
        console.log(\`[IndexNow] Отправка \${group.urls.length} URL для домена \${host}...\`);
        const response = await fetch('https://api.indexnow.org/indexnow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify(payload)
        });

        // 6. Строгая обработка ошибок и троттлинга (429, 5xx)
        if (!response.ok) {
          // Если ошибка сервера или превышение лимитов, пропускаем обновление БД для этого пакета,
          // оставляя needs_indexnow_ping = true для следующей попытки
          console.error(\`[IndexNow] Ошибка API для \${host}: \${response.status} \${response.statusText}\`);
          results.push({ clientId, status: 'error', error: \`\${response.status} \${response.statusText}\` });
          continue;
        }

        // 7. Подготовка пакетного обновления в БД в случае успеха (200 OK)
        console.log(\`[IndexNow] Успешный пинг для \${host}. Обработано \${group.urls.length} ссылок.\`);
        const now = new Date().toISOString();
        
        group.docRefs.forEach(ref => {
          batch.update(ref, {
            needs_indexnow_ping: false,
            last_pinged_at: now
          });
        });

        results.push({ clientId, status: 'success', urlsPinged: group.urls.length });

      } catch (clientError: any) {
        // Изолированная обработка ошибок для отдельного клиента, чтобы не прерывать весь крон
        console.error(\`[IndexNow] Внутренняя ошибка при обработке клиента \${clientId}:\`, clientError.message);
        results.push({ clientId, status: 'error', error: clientError.message });
      }
    }

    // Фиксация всех успешных изменений в Firestore одной транзакцией (до 500 операций)
    await batch.commit();

    return res.status(200).json({ success: true, processedClients: groupedAssets.size, results });

  } catch (error: any) {
    console.error('[IndexNow] Критическая ошибка крон-задачи:', error.message);
    return res.status(500).json({ success: false, error: 'Внутренняя ошибка при выполнении пакетного пинга IndexNow' });
  }
}
