import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

// Initialize Firebase Admin
let db: any = null;
let serviceAccount = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT && process.env.FIREBASE_SERVICE_ACCOUNT.trim().startsWith('{')) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
} catch (e) {
  console.error("FIREBASE_SERVICE_ACCOUNT parsing error:", e);
}

if (serviceAccount) {
  try {
    initializeApp({
      credential: cert(serviceAccount)
    });
    db = getFirestore();
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT not found. System usage tracking will be limited.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route: Generate Quiz
  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { prompt, config } = req.body;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          // The client provides the schema in the prompt usually OR we can define it here
          // For now, we trust the prompt structure but we can use responseSchema if needed
        }
      });

      // Track usage
      if (db) {
        const usageRef = db.doc('system/api_usage');
        await usageRef.set({
          count: FieldValue.increment(1),
          lastUsed: FieldValue.serverTimestamp()
        }, { merge: true });
      }

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route: Get Usage Stats
  app.get("/api/system/usage", async (req, res) => {
    if (!db) return res.status(500).json({ error: "Firebase Admin not initialized" });
    try {
      const doc = await db.doc('system/api_usage').get();
      res.json(doc.data() || { count: 0 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
