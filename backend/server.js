import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";
import { runPipeline } from "./promptEngine.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_IDEA_CHARS = 4000;

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY is not set. Add it to backend/.env before calling /api/generate.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(",") : true,
  })
);
app.use(express.json({ limit: "50kb" }));

// Protect your Gemini quota from abuse.
app.use(
  "/api/",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a minute and try again." },
  })
);

/* ---------- option handling ---------- */

const ALLOWED = {
  targetTool: ["Gemini", "Claude", "Replit", "Cursor"],
  skillLevel: ["Beginner", "Intermediate", "Expert"],
  purpose: ["College project", "Startup MVP", "Portfolio", "Client work", "Learning", "Research"],
  stack: ["MERN", "MEAN", "LAMP", "JAMstack", "Full Stack"],
  deployment: ["Vercel", "AWS", "Render"],
  auth: ["JWT", "Firebase"],
  model: ["OpenAI", "Gemini", "Claude"],
  database: ["MongoDB", "PostgreSQL"],
  outputLanguage: ["en", "ta"],
};

// Accepts only whitelisted values; maps blanks / "no_idea" -> AI_DECIDE, "not_needed" -> SKIP.
function pick(value, key, blank = "AI_DECIDE") {
  if (value === "not_needed") return "SKIP";
  if (!value || value === "no_idea") return blank;
  return ALLOWED[key].includes(value) ? value : blank;
}

function normalizeOptions(body) {
  const custom = body.mode === "customize";
  return {
    mode: custom ? "customize" : "ai",
    targetTool: pick(body.tools, "targetTool", "Unspecified"),
    skillLevel: pick(body.skillLevel, "skillLevel", "Not specified"),
    purpose: pick(body.purpose, "purpose", "Not specified"),
    outputLanguage: pick(body.outputLanguage, "outputLanguage", "en"),
    stack: custom ? pick(body.stack, "stack") : "AI_DECIDE",
    deployment: custom ? pick(body.deployment, "deployment") : "AI_DECIDE",
    auth: custom ? pick(body.auth, "auth") : "AI_DECIDE",
    model: custom ? pick(body.model, "model") : "AI_DECIDE",
    database: custom ? pick(body.database, "database") : "AI_DECIDE",
  };
}

/* ---------- Gemini call ---------- */

async function generate({ system, input, schema, temperature = 0.3 }) {
  const config = { systemInstruction: system, temperature };
  if (schema) {
    config.responseMimeType = "application/json";
    config.responseSchema = schema;
  }
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: input,
    config,
  });
  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

/* ---------- routes ---------- */

app.get("/api/health", (_req, res) => res.json({ ok: true, model: MODEL }));

app.post("/api/generate", async (req, res) => {
  try {
    const idea = String(req.body?.prompt ?? "").trim();
    if (idea.length < 3) {
      return res.status(400).json({ error: "Please describe your idea (at least a few words)." });
    }
    if (idea.length > MAX_IDEA_CHARS) {
      return res.status(400).json({ error: `Idea is too long. Keep it under ${MAX_IDEA_CHARS} characters.` });
    }

    const options = normalizeOptions(req.body);
    const { analysis, prompt, validation } = await runPipeline({ idea, options, generate });

    res.json({ result: prompt, analysis, validation, model: MODEL });
  } catch (error) {
    console.error("Generate failed:", error?.message || error);
    const status = error?.status || error?.code;
    if (status === 429) {
      return res.status(429).json({ error: "Gemini rate limit reached. Please try again shortly." });
    }
    if (status === 400 || status === 401 || status === 403) {
      return res.status(502).json({ error: "Gemini rejected the request. Check GEMINI_API_KEY and GEMINI_MODEL." });
    }
    res.status(500).json({ error: "Something went wrong while generating your prompt." });
  }
});

// Keep the old route working so existing clients don't break.
app.post("/generate", (req, res, next) => {
  req.url = "/api/generate";
  app.handle(req, res, next);
});

app.listen(PORT, () => console.log(`🔥 Server running on port ${PORT} (model: ${MODEL})`));
