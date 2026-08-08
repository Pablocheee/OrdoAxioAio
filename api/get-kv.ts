import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const redis = Redis.fromEnv();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CRITICAL: Add CORS headers so client websites can fetch this data
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { clientId } = req.query;

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const data = await redis.get(clientId);

    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching from Upstash Redis:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
