import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { runPipeline } from "./promptEngine.js";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
const app = express();
const PORT = Number(process.env.PORT || 5000);
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_KEY = process.env.GEMINI_API_KEY;
const allowedOrigins = (process.env.CLIENT_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);

app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error("Origin is not allowed by CORS"));
}}));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false }));

app.get("/", (_req, res) => res.json({ name: "Promptronix API", status: "ok" }));
app.get("/health", (_req, res) => res.json({ status: "ok", model: MODEL, apiKeyConfigured: Boolean(API_KEY) }));

app.post("/api/generate", async (req, res) => {
  try {
    const { idea, options = {} } = req.body || {};
    if (typeof idea !== "string" || idea.trim().length < 3) {
      return res.status(400).json({ error: "Please provide a project idea with at least 3 characters." });
    }
    if (idea.length > 12_000) return res.status(413).json({ error: "Project idea is too long (maximum 12,000 characters)." });
    if (!API_KEY) return res.status(503).json({ error: "Gemini API is not configured. Set GEMINI_API_KEY on the server." });

    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const generate = async ({ system, input, schema }) => {
      const config = { systemInstruction: system, temperature: 0.3 };
      if (schema) {
        config.responseMimeType = "application/json";
        config.responseSchema = schema;
      }
      const response = await ai.models.generateContent({ model: MODEL, contents: input, config });
      return response.text || "";
    };
    const result = await runPipeline({ idea: idea.trim(), options, generate });
    return res.json(result);
  } catch (error) {
    console.error("Prompt generation failed:", error?.message || error);
    const message = error?.status === 429 ? "Gemini rate limit reached. Please try again shortly." : "Prompt generation failed. Check server configuration and try again.";
    return res.status(error?.status === 429 ? 429 : 500).json({ error: message });
  }
});

app.use((err, _req, res, _next) => {
  console.error("Request error:", err?.message || err);
  res.status(500).json({ error: "Request could not be processed." });
});

app.listen(PORT, () => console.log(`Promptronix API listening on port ${PORT}`));
