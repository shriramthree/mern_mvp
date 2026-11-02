// One-call prompt engine for fast Promptronix generation.
// Keeping prompt generation to a single Gemini request removes the sequential
// analysis + composition calls that made the old flow feel slow.

export const REQUIRED_SECTIONS = [
  "ROLE & PERSONA",
  "CONTEXT & BACKGROUND",
  "OBJECTIVE",
  "USERS & USE CASES",
  "SCOPE",
  "FUNCTIONAL REQUIREMENTS",
  "NON-FUNCTIONAL REQUIREMENTS",
  "TECH STACK & CONSTRAINTS",
  "ARCHITECTURE, DATA & API",
  "UI / UX",
  "STEP-BY-STEP WORKFLOW",
  "OUTPUT FORMAT",
  "QUALITY BAR & ACCEPTANCE CRITERIA",
  "EDGE CASES & ERROR HANDLING",
  "SECURITY & PRIVACY",
  "ASSUMPTIONS & OPEN QUESTIONS",
  "SELF-REVIEW CHECKLIST",
];

const TOOL_GUIDANCE = {
  Gemini: "Write for Google Gemini. Use clear Markdown structure and precise instructions.",
  Claude: "Write for Claude. Use clearly separated sections, explicit constraints and deliverables.",
  Replit: "Write for Replit Agent. Specify the app, files, commands, dependencies, secrets and how to confirm it runs.",
  Cursor: "Write for Cursor. Be repository-aware and file-oriented; request incremental edits, exact file paths and terminal commands.",
};

export function buildFastSystem(options = {}) {
  const language =
    options.outputLanguage === "ta"
      ? "Write the final prompt in Tamil script. Keep code, technical names, filenames and commands in English."
      : "Write the final prompt in clear professional English, even when the original idea is Tamil or Tanglish.";

  const tool = TOOL_GUIDANCE[options.targetTool] || "Write a tool-agnostic prompt for a modern AI coding assistant.";
  const headings = REQUIRED_SECTIONS.map((label, index) => "## " + (index + 1) + ". " + label).join("\n");

  return [
    "You are Promptronix, an expert prompt architect. Create one complete, implementation-ready prompt from the user's idea and preferences.",
    language,
    tool,
    "",
    "Return ONLY the final prompt. Use every heading below exactly once and in this order:",
    headings,
    "",
    "FAST-GENERATION RULES:",
    "- Keep the complete prompt useful but concise. Aim for roughly 700-1,000 words, not a long essay.",
    "- Preserve the user's actual requirements. Do not invent facts, names, budgets, services or credentials.",
    "- Separate explicitly requested features from useful inferred additions.",
    "- When the user says AI should decide, choose a sensible default and briefly explain why.",
    "- When an item is marked SKIP / not needed, leave it out and mention it under SCOPE.",
    "- Make functional requirements numbered and testable.",
    "- Include a practical folder structure and API/data design only when appropriate for this project.",
    "- Include setup commands, environment-variable names (never secret values), tests and acceptance criteria.",
    "- Prefer sensible assumptions over asking follow-up questions. List at most three important assumptions or open questions.",
    "- Calibrate complexity to the user's stated skill level and purpose.",
    "- Avoid repeating the idea in every section. Do not include preamble or closing commentary.",
  ].join("\n");
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

export function validatePrompt(prompt) {
  const text = String(prompt || "");
  const missing = REQUIRED_SECTIONS.filter((label) => {
    const escaped = escapeRegex(label);
    const heading = new RegExp(
      "^\\s*(?:#{1,4}\\s*)?(?:\\d+[.)]\\s*)?\\**" + escaped + "\\b",
      "im"
    );
    return !heading.test(text);
  });
  return { ok: missing.length === 0, missing };
}

export function buildFastInput({ idea, options = {} }) {
  return [
    "PROJECT IDEA (preserve the meaning and all stated details):",
    idea,
    "",
    "USER PREFERENCES:",
    "Target AI / coding tool: " + (options.targetTool || "AI_DECIDE"),
    "Decision mode: " + (options.mode || "ai"),
    "Skill level: " + (options.skillLevel || "Not specified"),
    "Purpose: " + (options.purpose || "Not specified"),
    "Output language: " + (options.outputLanguage || "en"),
    "Technology stack: " + (options.stack || "AI_DECIDE"),
    "Database: " + (options.database || "AI_DECIDE"),
    "Authentication: " + (options.auth || "AI_DECIDE"),
    "Deployment: " + (options.deployment || "AI_DECIDE"),
    "AI integration preference: " + (options.model || "AI_DECIDE"),
    "",
    "Generate the final prompt now. Keep every required heading, but keep each section direct and concise.",
  ].join("\n");
}

export async function runPipeline({ idea, options = {}, generate }) {
  if (typeof idea !== "string" || idea.trim().length < 3) {
    throw new Error("Please provide a project idea with at least 3 characters.");
  }
  if (typeof generate !== "function") {
    throw new Error("The Gemini generation function is unavailable.");
  }

  const normalizedOptions = {
    targetTool: options.targetTool || "Unspecified",
    mode: options.mode || "ai",
    skillLevel: options.skillLevel || "Not specified",
    purpose: options.purpose || "Not specified",
    outputLanguage: options.outputLanguage || "en",
    stack: options.stack || "AI_DECIDE",
    database: options.database || "AI_DECIDE",
    auth: options.auth || "AI_DECIDE",
    deployment: options.deployment || "AI_DECIDE",
    model: options.model || "AI_DECIDE",
  };

  // Exactly one model call per generation. Section validation is local and
  // does not trigger another model request.
  const rawPrompt = await generate({
    system: buildFastSystem(normalizedOptions),
    input: buildFastInput({ idea: idea.trim(), options: normalizedOptions }),
  });

  const prompt = String(rawPrompt || "").trim();
  if (!prompt) {
    throw new Error("Gemini returned an empty prompt. Please try again.");
  }

  return {
    analysis: null,
    prompt,
    validation: validatePrompt(prompt),
    generationMode: "single-pass",
  };
}
