import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

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
