import express from "express";
import path from "path";
import * as cheerio from "cheerio";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI, Type } from "@google/genai";

if (!getApps().length) {
  initializeApp({
    projectId: "gen-lang-client-0081841990"
  });
}
const db = getFirestore();
db.settings({ databaseId: "ai-studio-coresync-baee7ba7-0afe-4299-b2c0-9fb2e8b42140" });

let ai: GoogleGenAI | null = null;
function getAi() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Vercel Serverless Analyzer Endpoint
  app.post("/api/analyze-voids", async (req, res) => {
    try {
      const { projectId } = req.body;
      if (!projectId) {
        return res.status(400).json({ error: "Missing projectId" });
      }

      // Fetch raw data
      const rawDataSnapshot = await db.collection("raw_client_data").where("projectId", "==", projectId).limit(1).get();
      if (rawDataSnapshot.empty) {
        return res.status(404).json({ error: "Raw data not found for this project" });
      }

      const rawDoc = rawDataSnapshot.docs[0];
      const rawData = rawDoc.data().data;

      const prompt = `You are an Enterprise Data Engineer specializing in AIO (Architecture for Information Optimization). 
Analyze the following scraped raw data from a client's website. 
Identify "Data Voids" (low-frequency semantic queries relevant to the categories/products but lacking structured, machine-readable answers in the current market).
Output ONLY a strict JSON array of strings containing the target semantic queries.

Raw Data:
${JSON.stringify(rawData, null, 2)}`;

      const aiClient = getAi();
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const dataVoids = JSON.parse(response.text || "[]");

      await db.collection("projects").doc(projectId).update({
        data_voids: dataVoids,
        status: "voids_identified"
      });

      res.json({ success: true, data_voids: dataVoids });
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vercel Serverless Asset Generation Endpoint
  app.post("/api/generate-assets", async (req, res) => {
    try {
      const { projectId } = req.body;
      if (!projectId) {
        return res.status(400).json({ error: "Missing projectId" });
      }

      const projectDoc = await db.collection("projects").doc(projectId).get();
      if (!projectDoc.exists) {
        return res.status(404).json({ error: "Project not found" });
      }

      const projectData = projectDoc.data() || {};
      const dataVoids = projectData.data_voids || [];
      const clientId = projectData.client_id;
      const projectUrl = projectData.project_url;

      if (!dataVoids.length) {
        return res.status(400).json({ error: "No data voids found for this project" });
      }

      const prompt = `You are an AIO (Architecture for Information Optimization) processor.
Based on the following Data Voids, generate perfectly valid JSON-LD blocks (specifically targeting Product, FAQPage, and AggregateRating schemas).
Also generate a rigid, semantic HTML skeleton corresponding to these data voids.
Output MUST be strictly machine-readable data.

Data Voids:
${JSON.stringify(dataVoids, null, 2)}`;

      const aiClient = getAi();
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              json_ld: { type: Type.STRING },
              semantic_html: { type: Type.STRING }
            },
            required: ["json_ld", "semantic_html"]
          }
        }
      });

      const generatedData = JSON.parse(response.text || "{}");

      await db.collection("optimized_assets").add({
        projectId: projectId,
        client_id: clientId,
        project_url: projectUrl,
        json_ld: generatedData.json_ld || "",
        semantic_html: generatedData.semantic_html || "",
        createdAt: new Date().toISOString()
      });

      await db.collection("projects").doc(projectId).update({
        status: "deployed"
      });

      res.json({ success: true, data: generatedData });
    } catch (error: any) {
      console.error("Asset generation error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vercel Serverless Scraper Endpoint (Simulated)
  app.post("/api/ingest", async (req, res) => {
    try {
      const { targetUrl } = req.body;
      if (!targetUrl) {
        return res.status(400).json({ error: "Missing targetUrl" });
      }

      // Fetch target URL
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
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

      res.json({ success: true, data: scrapedData });
    } catch (error: any) {
      console.error("Scraping error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // AI Delivery Endpoint
  app.all("/api/ai-delivery", async (req, res) => {
    try {
      const targetUrl = req.headers["x-original-url"] as string;
      if (!targetUrl) {
        return res.status(400).send("Missing x-original-url header");
      }

      const parsedUrl = new URL(targetUrl);
      
      // Placeholder for origin resolution (simulating the client's actual server)
      const originServer = "https://client-original-origin.com"; 
      const proxyUrl = new URL(parsedUrl.pathname + parsedUrl.search, originServer).toString();

      // Parallel Fetching: Firestore query and origin fetch concurrently
      const [assetsSnapshot, originResponse] = await Promise.all([
        db.collection("optimized_assets").where("project_url", "==", targetUrl).limit(1).get(),
        fetch(proxyUrl).catch(() => null)
      ]);

      if (!originResponse || !originResponse.ok) {
        return res.status(404).send("Origin fetch failed");
      }

      const html = await originResponse.text();

      // Fallback: If no optimized assets found, return raw origin HTML
      if (assetsSnapshot.empty) {
        res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
        return res.send(html);
      }

      const assetData = assetsSnapshot.docs[0].data();
      const $ = cheerio.load(html);

      // Inject JSON-LD into <head>
      if (assetData.json_ld) {
        $("head").append(`\n    <script type="application/ld+json">\n${assetData.json_ld}\n</script>\n  `);
      }

      // Inject Semantic HTML into <body>
      if (assetData.semantic_html) {
        $("body").append(`\n    <div id="ordo-axio-semantic-layer" style="display:none;" aria-hidden="true">\n${assetData.semantic_html}\n</div>\n  `);
      }

      // Aggressive caching
      res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
      res.send($.html());

      // Non-blocking hit tracking
      const userAgent = req.headers["user-agent"] || "";
      const domain = parsedUrl.hostname;
      
      (async () => {
        try {
          const aiBots = ['ChatGPT-User', 'Google-Extended', 'YandexAdditional', 'PerplexityBot', 'Sber', 'GigaChat'];
          let botName = 'Unknown Bot';
          for (const bot of aiBots) {
            if (userAgent.toLowerCase().includes(bot.toLowerCase())) {
              botName = bot;
              break;
            }
          }

          const hitsQuery = await db.collection("ai_bot_hits")
            .where("domain", "==", domain)
            .where("bot_name", "==", botName)
            .limit(1)
            .get();

          const isFirstHit = hitsQuery.empty;

          await db.collection("ai_bot_hits").add({
            target_url: targetUrl,
            domain: domain,
            bot_name: botName,
            user_agent: userAgent,
            timestamp: new Date().toISOString()
          });

          if (isFirstHit) {
            const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
            const telegramChatId = process.env.TELEGRAM_CHAT_ID;

            if (telegramToken && telegramChatId) {
              const message = `Ваша архитектура успешно проиндексирована ИИ ${botName}`;
              await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: telegramChatId,
                  text: message
                })
              });
            }
          }
        } catch (err) {
          console.error("Hit tracking error:", err);
        }
      })();
    } catch (error) {
      console.error("AI delivery error:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // Vercel Domains API Endpoint
  app.post("/api/add-domain", async (req, res) => {
    try {
      const { domain, projectId, client_id } = req.body;
      if (!domain || !projectId || !client_id) {
        return res.status(400).json({ error: "Missing domain, projectId, or client_id" });
      }

      const vercelToken = process.env.VERCEL_AUTH_TOKEN;
      const vercelProjectId = process.env.VERCEL_PROJECT_ID;

      if (!vercelToken || !vercelProjectId) {
        return res.status(500).json({ error: "Missing Vercel API credentials in environment" });
      }

      const response = await fetch(`https://api.vercel.com/v10/projects/${vercelProjectId}/domains`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${vercelToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: domain })
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ success: false, error: data.error?.message || "Failed to add domain" });
      }

      // Update Firestore
      await db.collection("projects").doc(projectId).update({
        active_domain: domain,
        updatedAt: new Date().toISOString()
      });

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Domain addition error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
