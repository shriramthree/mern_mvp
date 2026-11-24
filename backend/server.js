import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runPipeline, runDiscovery } from "./promptEngine.js";

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
    if (!origin || allowedOrigins.size === 0 || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("CORS_ORIGIN_DENIED"));
  },
}));
app.use(express.json({ limit: "50kb" }));

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
  targetTool: ["Google AI Studio", "v0 by Vercel", "Claude", "Lovable", "Bolt.new", "Replit", "Firebase Studio", "Base44", "Emergent", "Create.xyz", "Tempo Labs", "GitHub Spark"],
  skillLevel: ["Beginner", "Intermediate", "Advanced", "Expert", "Not sure — adapt to me"],
  userRole: ["Student", "Software Developer", "Founder / Entrepreneur", "Business Owner", "UI/UX Designer", "Digital Marketer", "Content Creator", "Researcher", "Educator", "Other professional"],
  targetAudience: ["General public", "Customers / consumers", "Students", "Teachers / educators", "Developers / technical teams", "Small businesses", "Enterprise teams", "Internal organization users", "Farmers / local communities", "Not sure — let AI decide"],
  purpose: ["Build a web application", "Build a mobile application", "Create a website or landing page", "Design a UI/UX prototype", "Build an AI-powered product", "Automate a workflow", "Create content or a marketing campaign", "Research or analyze information", "Learn a subject or solve an academic problem", "Plan a business or product", "Other / let AI infer"],
  complexity: ["Simple and focused", "Balanced", "Advanced and feature-rich", "Production-ready / enterprise"],
  expectedOutput: ["Complete working application", "UI/UX design and frontend", "Architecture and implementation plan", "Code generation with file-by-file steps", "Research report or structured explanation", "Content, copywriting or campaign assets", "Workflow automation", "Other / let AI decide"],
  stack: ["MERN", "MEAN", "Next.js + TypeScript", "React + Node.js", "Python + FastAPI", "Full Stack", "Let AI decide"],
  deployment: ["Vercel", "Firebase Hosting", "Netlify", "AWS", "Render", "Local only", "Let AI decide"],
  auth: ["Email and password", "JWT", "Firebase Authentication", "OAuth / social login", "Role-based authentication", "Not needed", "Let AI decide"],
  model: ["OpenAI", "Gemini", "Claude", "OpenRouter", "NVIDIA NIM", "Not needed", "Let AI decide"],
  database: ["PostgreSQL", "MongoDB", "Firebase / Firestore", "Supabase", "MySQL", "No database", "Let AI decide"],
  outputLanguage: ["en", "ta"],
};

function pick(value, key, blank = "AI_DECIDE") {
  if (value === "not_needed" || value === "Not needed" || value === "No database" || value === "No backend for now") return "SKIP";
  if (!value || value === "no_idea" || value === "Let AI decide" || value === "Let AI decide —") return blank;
  return ALLOWED[key] && ALLOWED[key].includes(value) ? value : blank;
}

function cleanText(value, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeDynamicAnswers(body = {}) {
  const answers = {};
  const source = body.dynamicAnswers && typeof body.dynamicAnswers === "object" && !Array.isArray(body.dynamicAnswers) ? body.dynamicAnswers : {};
  for (const [key, value] of Object.entries(source).slice(0, 5)) {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    if (safeKey && typeof value === "string" && value.trim()) answers[safeKey] = value.trim().slice(0, 200);
  }
  const questions = Array.isArray(body.dynamicQuestions) ? body.dynamicQuestions.slice(0, 5).map((question) => ({
    id: cleanText(question && question.id, 40),
    label: cleanText(question && question.label, 140),
  })).filter((question) => question.id && question.label) : [];
  return { answers, questions };
}

function normalizeOptions(body = {}) {
  const custom = body.mode === "customize";
  const dynamic = normalizeDynamicAnswers(body);
  return {
    mode: custom ? "customize" : "ai",
    targetTool: pick(body.tools, "targetTool", "Unspecified"),
    userRole: pick(body.userRole, "userRole", "Not specified"),
    targetAudience: pick(body.targetAudience, "targetAudience", "Not specified"),
    purpose: pick(body.purpose, "purpose", "Not specified"),
    skillLevel: pick(body.skillLevel, "skillLevel", "Not specified"),
    complexity: pick(body.complexity, "complexity", "AI_DECIDE"),
    expectedOutput: pick(body.expectedOutput, "expectedOutput", "AI_DECIDE"),
    outputLanguage: pick(body.outputLanguage, "outputLanguage", "en"),
    stack: custom ? pick(body.stack, "stack") : "AI_DECIDE",
    deployment: custom ? pick(body.deployment, "deployment") : "AI_DECIDE",
    auth: custom ? pick(body.auth, "auth") : "AI_DECIDE",
    model: custom ? pick(body.model, "model") : "AI_DECIDE",
    database: custom ? pick(body.database, "database") : "AI_DECIDE",
    dynamicAnswers: dynamic.answers,
    dynamicQuestions: dynamic.questions,
  };
}

async function generate({ system, input, schema }) {
  if (!API_KEY) {
    const error = new Error("GEMINI_API_KEY is not configured on the backend.");
    error.status = 503;
    throw error;
  }
  const generationConfig = { thinkingConfig: { thinkingLevel: "low" } };
  if (schema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = schema;
  }
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(MODEL) + ":generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      signal: AbortSignal.timeout(60_000),
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
  const text = (payload?.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("").trim();
  if (!text) {
    const error = new Error("Gemini returned an empty response. Try again.");
    error.status = 502;
    throw error;
  }
  return text;
}

app.get("/", (_req, res) => res.json({ name: "Promptronix API", status: "ok" }));
app.get("/api/health", (_req, res) => res.json({ ok: true, provider: "Gemini", model: MODEL, apiKeyConfigured: Boolean(API_KEY) }));

function validateIdea(req, res) {
  const rawIdea = req.body?.prompt;
  const idea = typeof rawIdea === "string" ? rawIdea.trim() : "";
  if (idea.length < 3) {
    res.status(400).json({ error: "Please describe your idea using at least 3 characters." });
    return null;
  }
  if (idea.length > MAX_IDEA_CHARS) {
    res.status(400).json({ error: "Idea is too long. Keep it under " + MAX_IDEA_CHARS + " characters." });
    return null;
  }
  if (!API_KEY) {
    res.status(503).json({ error: "Gemini is not configured. Add GEMINI_API_KEY to your backend hosting environment." });
    return null;
  }
  return idea;
}

async function handleDiscover(req, res) {
  try {
    const idea = validateIdea(req, res);
    if (!idea) return;
    const options = normalizeOptions(req.body);
    const discovery = await runDiscovery({ idea, options, generate });
    return res.json({ ...discovery, model: MODEL });
  } catch (error) {
    console.error("Requirement discovery failed:", error?.message || error);
    const status = Number(error?.status) || 502;
    return res.status(status).json({ error: status === 429 ? "Gemini rate limit reached. Please try again shortly." : "Could not identify follow-up questions. Use the adaptive fallback questions and continue." });
  }
}

async function handleGenerate(req, res) {
  try {
    const idea = validateIdea(req, res);
    if (!idea) return;
    const options = normalizeOptions(req.body);
    const output = await runPipeline({ idea, options, generate });
    return res.json({ result: output.prompt, analysis: output.analysis, validation: output.validation, nvidiaSkills: output.nvidiaSkills, model: MODEL, generationMode: output.generationMode });
  } catch (error) {
    console.error("Prompt generation failed:", error?.message || error);
    const status = Number(error?.status) || 500;
    if (status === 429) return res.status(429).json({ error: "Gemini rate limit reached. Please try again shortly." });
    if (status === 400 || status === 401 || status === 403) return res.status(502).json({ error: "Gemini rejected the request. Check GEMINI_API_KEY and GEMINI_MODEL." });
    if (status === 504 || error?.name === "TimeoutError" || error?.name === "AbortError") return res.status(504).json({ error: "Gemini took too long to respond. Please try again with a shorter idea." });
    if (status === 503) return res.status(503).json({ error: error.message || "Gemini is temporarily unavailable." });
    return res.status(502).json({ error: "Prompt generation failed. Please try again." });
  }
}

app.post("/api/discover", handleDiscover);
app.post("/api/generate", handleGenerate);
app.post("/generate", handleGenerate);

app.use((error, _req, res, _next) => {
  if (error?.message === "CORS_ORIGIN_DENIED") return res.status(403).json({ error: "This website origin is not allowed by the backend." });
  if (error?.type === "entity.parse.failed") return res.status(400).json({ error: "Request body must be valid JSON." });
  console.error("Request middleware error:", error?.message || error);
  return res.status(500).json({ error: "Request could not be processed." });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log("Promptronix API listening on port " + PORT + " (model: " + MODEL + ")");
    if (!API_KEY) console.warn("GEMINI_API_KEY is missing; generation requests will return HTTP 503.");
  });
}

export { app, handleDiscover, handleGenerate, normalizeOptions };
