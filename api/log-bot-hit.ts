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
 * Обработчик для записи событий (логов) о посещении страниц AI-ботами.
 * Предназначен для максимально быстрого ответа (fire-and-forget).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Разрешаем только POST-запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается, разрешен только POST' });
  }

  try {
    const { clientId, url, botName, timestamp } = req.body;

    // Быстрая валидация обязательных полей
    if (!clientId || !botName) {
      return res.status(400).json({ error: 'Отсутствуют обязательные параметры (clientId, botName)' });
    }

    // Подготовка данных для записи
    const logData = {
      clientId,
      url: url || '',
      botName,
      // Если timestamp передан, пытаемся создать Date, иначе используем текущее время
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      createdAt: new Date()
    };

    // Асинхронная запись в коллекцию bot_analytics
    await db.collection('bot_analytics').add(logData);

    // Быстрый возврат успешного статуса
    return res.status(200).json({ success: true });
    
  } catch (error: any) {
    // Логирование ошибки в консоль Vercel без прерывания работы вызывающей стороны
    console.error('Ошибка при записи лога AI-бота:', error.message);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера при сохранении лога' });
  }
}
