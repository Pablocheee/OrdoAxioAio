import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const redis = Redis.fromEnv();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { clientId, payload } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    await redis.set(clientId, payload);

    return res.status(200).json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving to Upstash Redis:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
