import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не поддерживается (Method not allowed)' });
  }

  try {
    const { targetUrl } = req.body;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Отсутствует targetUrl (Missing targetUrl)' });
    }

    // Fetch target URL
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Не удалось получить данные по URL: ${response.statusText}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract metadata and headers
    const title = $("title").text();
    const description = $("meta[name='description']").attr("content") || "";
    
    const h1: string[] = [];
    const h2: string[] = [];
    const h3: string[] = [];
    
    $("h1").each((_, el) => h1.push($(el).text().trim()));
    $("h2").each((_, el) => h2.push($(el).text().trim()));
    $("h3").each((_, el) => h3.push($(el).text().trim()));
    
    const scrapedData = {
      title,
      description,
      h1,
      h2,
      h3,
      sourceUrl: targetUrl,
    };
    
    return res.status(200).json({ success: true, data: scrapedData });
  } catch (error: any) {
    console.error("Ошибка парсинга (Scraping error):", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
