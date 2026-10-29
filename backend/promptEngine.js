// Prompt-engine pipeline for Promptronix.
export const REQUIRED_SECTIONS = [
  { label: "ROLE & PERSONA", description: "Define the expert role and intended audience." },
  { label: "PROJECT CONTEXT", description: "Explain the problem, goals, users, and constraints." },
  { label: "FEATURES & USER FLOWS", description: "List core features and realistic user journeys." },
  { label: "TECH STACK & ARCHITECTURE", description: "Specify the requested tools, project structure, and integrations." },
  { label: "UI/UX REQUIREMENTS", description: "Describe visual style, accessibility, responsive behavior, and states." },
  { label: "FUNCTIONAL REQUIREMENTS", description: "Give implementable requirements and acceptance criteria." },
  { label: "NON-FUNCTIONAL REQUIREMENTS", description: "Cover security, performance, reliability, and maintainability." },
  { label: "DELIVERABLES", description: "Specify files, commands, documentation, and setup steps." },
  { label: "TESTING & VALIDATION", description: "Define tests and how to verify the result." },
];

const analysisSchema = {
  type: "OBJECT",
  properties: {
    detected_language: { type: "STRING" }, normalized_idea_en: { type: "STRING" }, understood_summary: { type: "STRING" },
    project_type: { type: "STRING" }, domain: { type: "STRING" }, problem_statement: { type: "STRING" },
    target_users: { type: "ARRAY", items: { type: "STRING" } }, core_features: { type: "ARRAY", items: { type: "STRING" } },
    implied_features: { type: "ARRAY", items: { type: "STRING" } }, constraints: { type: "ARRAY", items: { type: "STRING" } },
    edge_cases: { type: "ARRAY", items: { type: "STRING" } }, sensitive_areas: { type: "ARRAY", items: { type: "STRING" } },
    suggested_decisions: { type: "ARRAY", items: { type: "STRING" } }, assumptions: { type: "ARRAY", items: { type: "STRING" } },
    open_questions: { type: "ARRAY", items: { type: "STRING" } }, complexity: { type: "STRING" }, confidence: { type: "NUMBER" },
  },
  required: ["detected_language", "normalized_idea_en", "understood_summary", "project_type", "domain", "problem_statement", "target_users", "core_features", "implied_features", "constraints", "edge_cases", "sensitive_areas", "suggested_decisions", "assumptions", "open_questions", "complexity", "confidence"],
};

export function buildComposeSystem(options = {}) {
  const tool = options.targetTool || "any modern coding assistant";
  const lang = options.outputLanguage || "en";
  const languageInstruction = lang === "ta" ? "Write the generated prompt in Tamil script, retaining standard technical names in English where natural." : lang === "en" ? "Write the generated prompt in clear professional English." : "Write the generated prompt in the requested output language.";
  return `You are Promptronix, an expert prompt architect for coding tools. Create a complete, actionable, self-contained prompt for ${tool}. ${languageInstruction}
Preserve the original user idea and its language nuance. Do not invent credentials, API keys, or external services. State assumptions clearly. Require a polished responsive UI, working functionality, meaningful errors/loading/empty states, accessible controls, secure configuration, tests, and setup documentation as appropriate.
Return Markdown with these exact numbered section headings, each exactly once and in order:
${REQUIRED_SECTIONS.map((s, i) => `${i + 1}. ${s.label}: ${s.description}`).join("\n")}
Do not omit FUNCTIONAL REQUIREMENTS or merge it into another section. If a requested capability is impossible to verify, label it as an assumption or ask for configuration details.`;
}

export function validatePrompt(prompt) {
  const text = String(prompt || "");
  const missing = REQUIRED_SECTIONS.filter((s) => !new RegExp(`^\\s*#{1,6}\\s*\\d*\\.?\\s*${s.label.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*$`, "im").test(text) && !new RegExp(`^\\s*\\d+\\.\\s*${s.label.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*:`, "im").test(text)).map((s) => s.label);
  return { ok: missing.length === 0, missing };
}

function safeJson(value) {
  const cleaned = String(value || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned);
}

const analysisSystem = `You are an expert requirements analyst. Analyze a user's project idea without losing any details. Return only JSON matching the supplied schema. Detect the input language; preserve the original phrase in your understanding. Identify core and implied features, constraints, risks, edge cases, assumptions, open questions, complexity and confidence. Do not add unsupported claims.`;

export async function runPipeline({ idea, options = {}, generate }) {
  if (typeof idea !== "string" || !idea.trim()) throw new Error("A project idea is required.");
  if (typeof generate !== "function") throw new Error("A model generation function is required.");
  const normalizedOptions = { targetTool: options.targetTool || options.tool || "Replit", outputLanguage: options.outputLanguage || "en" };
  const analysisRaw = await generate({ system: analysisSystem, input: `Analyze this idea. Keep its original language and intent.\n\n${idea}`, schema: analysisSchema });
  const analysis = safeJson(analysisRaw);
  const composeInput = `ORIGINAL USER IDEA (preserve this wording and details):\n${idea}\n\nSTRUCTURED ANALYSIS:\n${JSON.stringify(analysis, null, 2)}\n\nCreate the complete prompt now. Do not replace or ignore the original idea.`;
  let prompt = await generate({ system: buildComposeSystem(normalizedOptions), input: composeInput });
  let validation = validatePrompt(prompt);
  if (!validation.ok) {
    prompt = await generate({ system: buildComposeSystem(normalizedOptions), input: `${composeInput}\n\nREPAIR THIS DRAFT: include the missing sections exactly: ${validation.missing.join(", ")}. Return the full corrected prompt, not an excerpt.\n\nDRAFT:\n${prompt}` });
    validation = validatePrompt(prompt);
  }
  return { analysis, prompt: String(prompt || "").trim(), validation, options: normalizedOptions };
}

export { analysisSchema };
