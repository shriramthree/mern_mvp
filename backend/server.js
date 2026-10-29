import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runPipeline } from "./promptEngine.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const API_KEY = process.env.GEMINI_API_KEY;
const MAX_IDEA_CHARS = 4000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
const rateLimitEntries = new Map();
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);

const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.size === 0 || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS_ORIGIN_DENIED"));
  },
}));
app.use(express.json({ limit: "50kb" }));

// Lightweight in-memory rate limit to protect the provider quota.
// For multi-instance deployments, use a shared store such as Redis.
function limitRequests(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  let entry = rateLimitEntries.get(key);

  if (!entry || now - entry.startedAt >= RATE_LIMIT_WINDOW_MS) {
    entry = { startedAt: now, count: 0 };
    rateLimitEntries.set(key, entry);
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    res.set("Retry-After", String(Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.startedAt)) / 1000)));
    return res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
  }

  if (rateLimitEntries.size > 5000) {
    for (const [ip, value] of rateLimitEntries) {
      if (now - value.startedAt >= RATE_LIMIT_WINDOW_MS) rateLimitEntries.delete(ip);
    }
  }
  return next();
}

app.use("/api", limitRequests);
app.use("/generate", limitRequests);

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

function pick(value, key, blank = "AI_DECIDE") {
  if (value === "not_needed") return "SKIP";
  if (!value || value === "no_idea") return blank;
  return ALLOWED[key].includes(value) ? value : blank;
}

function normalizeOptions(body = {}) {
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

/**
 * Calls the Gemini REST API using Node's built-in fetch. This keeps tests for
 * the prompt pipeline independent of a network connection or API key.
 */
async function generate({ system, input, schema, temperature = 0.3 }) {
  if (!API_KEY) {
    const error = new Error("GEMINI_API_KEY is not configured on the backend.");
    error.status = 503;
    throw error;
  }

  const generationConfig = { temperature };
  if (schema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = schema;
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(MODEL) + ":generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: input }] }],
        generationConfig,
      }),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || "Gemini API request failed.");
    error.status = response.status;
    throw error;
  }

  const text = (payload?.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    const error = new Error("Gemini returned an empty response. Try again.");
    error.status = 502;
    throw error;
  }
  return text;
}

app.get("/", (_req, res) => res.json({ name: "Promptronix API", status: "ok" }));
app.get("/api/health", (_req, res) => res.json({
  ok: true,
  provider: "Gemini",
  model: MODEL,
  apiKeyConfigured: Boolean(API_KEY),
}));

async function handleGenerate(req, res) {
  try {
    const rawIdea = req.body?.prompt;
    const idea = typeof rawIdea === "string" ? rawIdea.trim() : "";

    if (idea.length < 3) {
      return res.status(400).json({ error: "Please describe your idea using at least 3 characters." });
    }
    if (idea.length > MAX_IDEA_CHARS) {
      return res.status(400).json({ error: "Idea is too long. Keep it under " + MAX_IDEA_CHARS + " characters." });
    }
    if (!API_KEY) {
      return res.status(503).json({ error: "Gemini is not configured. Add GEMINI_API_KEY to backend/.env or your hosting environment." });
    }

    const options = normalizeOptions(req.body);
    const { analysis, prompt, validation } = await runPipeline({ idea, options, generate });

    return res.json({ result: prompt, analysis, validation, model: MODEL });
  } catch (error) {
    console.error("Prompt generation failed:", error?.message || error);
    const status = Number(error?.status) || 500;

    if (status === 429) {
      return res.status(429).json({ error: "Gemini rate limit reached. Please try again shortly." });
    }
    if (status === 400 || status === 401 || status === 403) {
      return res.status(502).json({ error: "Gemini rejected the request. Check GEMINI_API_KEY and GEMINI_MODEL." });
    }
    if (status === 503) {
      return res.status(503).json({ error: error.message || "Gemini is temporarily unavailable." });
    }
    return res.status(502).json({ error: "Prompt generation failed. Please try again." });
  }
}

app.post("/api/generate", handleGenerate);
// Retain the original endpoint as a backward-compatible alias.
app.post("/generate", handleGenerate);

app.use((error, _req, res, _next) => {
  if (error?.message === "CORS_ORIGIN_DENIED") {
    return res.status(403).json({ error: "This website origin is not allowed by the backend." });
  }
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  console.error("Request middleware error:", error?.message || error);
  return res.status(500).json({ error: "Request could not be processed." });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log("Promptronix API listening on port " + PORT + " (model: " + MODEL + ")");
    if (!API_KEY) console.warn("GEMINI_API_KEY is missing; generation requests will return HTTP 503.");
  });
}

export { app, handleGenerate, normalizeOptions };
