import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    projectId: "gen-lang-client-0081841990"
  });
}
const db = getFirestore();
db.settings({ databaseId: "ai-studio-coresync-baee7ba7-0afe-4299-b2c0-9fb2e8b42140" });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const domain = req.query.domain as string;
    if (!domain) {
      return res.status(400).json({ error: "Missing domain parameter" });
    }

    const projectsSnapshot = await db.collection("projects").where("active_domain", "==", domain).limit(1).get();
    if (projectsSnapshot.empty) {
      return res.status(404).json({ error: "Origin not found" });
    }

    const projectData = projectsSnapshot.docs[0].data();
    
    // Ensure we have a valid URL for the origin
    const originUrl = projectData.project_url;
    if (!originUrl) {
      return res.status(404).json({ error: "Origin URL not set" });
    }

    // We cache this heavily since domain mappings rarely change
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    res.status(200).json({ success: true, origin: originUrl });
  } catch (error: any) {
    console.error("Origin lookup error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}
