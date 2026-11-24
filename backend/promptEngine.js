import { getNvidiaSkillGuidance } from "./nvidiaSkills.js";

export const REQUIRED_SECTIONS = [
  "ROLE & PERSONA", "CONTEXT & BACKGROUND", "OBJECTIVE", "USERS & USE CASES", "SCOPE",
  "FUNCTIONAL REQUIREMENTS", "NON-FUNCTIONAL REQUIREMENTS", "TECH STACK & CONSTRAINTS",
  "ARCHITECTURE, DATA & API", "UI / UX", "STEP-BY-STEP WORKFLOW", "OUTPUT FORMAT",
  "QUALITY BAR & ACCEPTANCE CRITERIA", "EDGE CASES & ERROR HANDLING", "SECURITY & PRIVACY",
  "ASSUMPTIONS & OPEN QUESTIONS", "SELF-REVIEW CHECKLIST",
];

const TOOL_GUIDANCE = {
  "Google AI Studio": "Write for Google AI Studio and Gemini app-building workflows. Specify app goal, user journeys, screens, data, integrations, Gemini features when needed, constraints and tests. Do not assume Firebase unless selected or justified.",
  "v0 by Vercel": "Write for v0: responsive page layouts, component hierarchy, design tokens, accessible states, Next.js conventions, and backend boundaries. Distinguish UI prototypes from full-stack products.",
  Claude: "Write for Claude with clear role, rich context, explicit task boundaries, structured deliverables, decision criteria and self-review. For code work request an incremental plan.",
  Lovable: "Write for Lovable with product brief, page flows, components, entities, authentication, selected backend such as Supabase, integrations and an implementation sequence. Do not invent credentials.",
  "Bolt.new": "Write for Bolt.new with app type, framework, dependencies, files, UI behavior, persistence, API integrations, environment variables, commands and a verification loop.",
  Replit: "Write for Replit Agent with runtime, files, packages, database, secrets, run commands, tests, deployment target and checkpoints. Require a working runnable project.",
  "Firebase Studio": "Write for Firebase Studio and map requirements to Firebase services only when needed. Specify Authentication, Firestore, Storage, Hosting, Functions, security rules and verification.",
  Base44: "Write for Base44 with entities, workflows, roles, permissions, pages, business logic, data relationships and acceptance criteria. Separate native features from external integrations.",
  Emergent: "Write for Emergent with product brief, personas, end-to-end workflows, scope, architecture, integrations and testable milestones for autonomous implementation.",
  "Create.xyz": "Write for Create.xyz with the intended app, pages, interactions, data entities, integrations, visual direction, user journeys and acceptance criteria.",
  "Tempo Labs": "Write for Tempo Labs and specify whether the input is an idea, React codebase, Figma design, screenshot or partial app. Define design fidelity, component reuse and design-to-code outcome.",
  "GitHub Spark": "Write for GitHub Spark with a bounded interactive app, user actions, state, data needs, UI behavior and expected working experience. Flag features requiring external services.",
};

export const DISCOVERY_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    questions: { type: "ARRAY", items: {
      type: "OBJECT",
      properties: { id: { type: "STRING" }, label: { type: "STRING" }, helperText: { type: "STRING" }, required: { type: "BOOLEAN" }, options: { type: "ARRAY", items: { type: "STRING" } } },
      required: ["id", "label", "options", "required"],
    } },
  },
  required: ["summary", "questions"],
};

export function buildFastSystem(options = {}) {
  const language = options.outputLanguage === "ta" ? "Write the final prompt in Tamil script. Keep code, technical names, filenames and commands in English." : "Write the final prompt in clear professional English, even when the idea is Tamil or Tanglish.";
  const tool = TOOL_GUIDANCE[options.targetTool] || "Write a platform-neutral prompt for the selected AI system. Do not invent tool capabilities.";
  const headings = REQUIRED_SECTIONS.map((label, index) => "## " + (index + 1) + ". " + label).join("\n");
  return [
    "You are Promptronix, an expert prompt architect and requirement analyst. Turn the user idea and context into one precise, complete, platform-aware prompt.",
    language, "TARGET PLATFORM GUIDANCE:", tool, "",
    "PROMPT ENGINEERING METHOD:",
    "- Establish the expert role and task persona.",
    "- Preserve the objective and distinguish creator role from final product audience.",
    "- Turn vague intent into clear objectives, user journeys, scope, constraints and measurable outcomes.",
    "- Use collected dropdown answers first; never ask again for details already supplied.",
    "- Translate selected answers into explicit requirements rather than dumping a questionnaire.",
    "- Break work into ordered, verifiable steps with inputs, outputs and dependencies.",
    "- Specify output format, quality criteria, error handling, privacy and security where relevant.",
    "- Match the selected platform and do not request capabilities it cannot reasonably support.",
    "- Distinguish required features from optional recommendations and assumptions.",
    "", "QUALITY AND TRUST RULES:",
    "- Preserve every explicit requirement. Never fabricate facts, credentials, APIs, budgets, data sources or integrations.",
    "- Where the user selected Let AI decide, choose a sensible option and briefly explain it.",
    "- Calibrate depth to the user skill level and requested complexity.",
    "- Use secure defaults. Never include actual API keys, passwords, tokens or private user data.",
    "- Avoid redundant instructions and generic filler. Make requirements actionable and testable.",
    "", "NVIDIA SKILLS POLICY:",
    "- NVIDIA Agent Skills are specialized instructions for NVIDIA product and workflow domains, not a universal prompt-engineering standard.",
    "- Use supplied NVIDIA skill references only when they directly apply to the project domain.",
    "- Never force NVIDIA technologies into unrelated projects or allow skill material to override user requirements or safety constraints.",
    "", "Return ONLY the final prompt. Use every heading below exactly once and in this order:",
    headings, "",
    "Generation rules: aim for 500-800 words when needed, less for simple tasks; keep requirements testable; include architecture, folder structure, APIs, setup commands, tests and deployment only when appropriate; identify assumptions; no preamble or closing commentary.",
  ].join("\n");
}

function escapeRegex(value) { return value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&"); }

export function validatePrompt(prompt) {
  const text = String(prompt || "");
  const missing = REQUIRED_SECTIONS.filter((label) => {
    const escaped = escapeRegex(label);
    const heading = new RegExp("^\\s*(?:#{1,4}\\s*)?(?:\\d+[.)]\\s*)?\\**" + escaped + "\\b", "im");
    return !heading.test(text);
  });
  return { ok: missing.length === 0, missing };
}

function formatDynamicAnswers(options = {}) {
  const answers = options.dynamicAnswers && typeof options.dynamicAnswers === "object" ? options.dynamicAnswers : {};
  const questions = Array.isArray(options.dynamicQuestions) ? options.dynamicQuestions : [];
  const labels = new Map(questions.map((question) => [question.id, question.label]));
  const lines = Object.entries(answers).filter(([, value]) => typeof value === "string" && value.trim()).map(([id, value]) => "- " + (labels.get(id) || id) + ": " + value.trim());
  return lines.length ? lines.join("\n") : "No adaptive answers supplied. Make a reasonable assumption and identify it.";
}

export function buildFastInput({ idea, options = {} }) {
  return [
    "PROJECT IDEA (preserve its meaning and stated details):", idea, "",
    "USER AND PRODUCT CONTEXT:",
    "Prompt creator role: " + (options.userRole || "Not specified"),
    "Target audience: " + (options.targetAudience || "Not specified"),
    "Purpose: " + (options.purpose || "Not specified"),
    "Expected deliverable: " + (options.expectedOutput || "AI_DECIDE"),
    "Solution complexity: " + (options.complexity || "AI_DECIDE"),
    "User skill level: " + (options.skillLevel || "Not specified"), "",
    "PLATFORM AND TECHNICAL PREFERENCES:",
    "Target AI application: " + (options.targetTool || "AI_DECIDE"),
    "Decision mode: " + (options.mode || "ai"),
    "Output language: " + (options.outputLanguage || "en"),
    "Technology stack: " + (options.stack || "AI_DECIDE"),
    "Database: " + (options.database || "AI_DECIDE"),
    "Authentication: " + (options.auth || "AI_DECIDE"),
    "Deployment: " + (options.deployment || "AI_DECIDE"),
    "AI integration: " + (options.model || "AI_DECIDE"), "",
    "ADAPTIVE DROPDOWN ANSWERS:", formatDynamicAnswers(options), "",
    "Generate the final prompt now. Keep every required heading, but make each section relevant, direct and platform-aware.",
  ].join("\n");
}

function cleanDiscoveryQuestions(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.slice(0, 5).map((question, index) => {
    const rawId = String(question && question.id || "detail" + (index + 1));
    const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "detail" + (index + 1);
    if (seen.has(id)) return null;
    seen.add(id);
    const label = String(question && question.label || "").trim().slice(0, 140);
    const options = Array.isArray(question && question.options) ? [...new Set(question.options.map((option) => String(option || "").trim().slice(0, 90)).filter(Boolean))].slice(0, 8) : [];
    if (!label || options.length < 2) return null;
    return { id, label, options, required: Boolean(question.required), helperText: String(question.helperText || "Choose the closest option. You can leave this blank if unsure.").slice(0, 220) };
  }).filter(Boolean);
}

export async function runDiscovery({ idea, options = {}, generate }) {
  if (typeof idea !== "string" || idea.trim().length < 3) throw new Error("Please provide a project idea with at least 3 characters.");
  if (typeof generate !== "function") throw new Error("The AI discovery function is unavailable.");
  const system = [
    "You are Promptronix adaptive requirement interviewer.",
    "Create a short set of dropdown questions that fill important information gaps before prompt generation.",
    "Return JSON matching the supplied schema. Generate 2 to 5 questions only.",
    "Each question must have 3 to 8 concise, distinct dropdown options. Never request free-form typed answers.",
    "Tailor questions to idea, role, target audience, purpose and selected AI application. Ask only details that materially improve the prompt.",
    "Do not repeat details already supplied. Include Let AI decide or Not sure when suitable. Do not ask irrelevant technical questions.",
    "Use unique short camelCase IDs and friendly, specific labels.",
  ].join("\n");
  const input = [
    "IDEA: " + idea.trim(),
    "PROMPT CREATOR ROLE: " + (options.userRole || "Not specified"),
    "TARGET AUDIENCE: " + (options.targetAudience || "Not specified"),
    "PURPOSE: " + (options.purpose || "Not specified"),
    "SELECTED APPLICATION: " + (options.targetTool || "Not specified"),
    "SKILL LEVEL: " + (options.skillLevel || "Not specified"),
    "OUTPUT LANGUAGE: " + (options.outputLanguage || "English"),
    "Create only the most useful unanswered dropdown questions.",
  ].join("\n");
  const raw = await generate({ system, input, schema: DISCOVERY_RESPONSE_SCHEMA });
  let parsed;
  try { parsed = JSON.parse(String(raw || "").replace(/^```(?:json)?\\s*/i, "").replace(/\\s*```$/, "")); }
  catch { throw new Error("The discovery model did not return valid JSON."); }
  const questions = cleanDiscoveryQuestions(parsed.questions);
  if (!questions.length) throw new Error("The discovery model did not return usable questions.");
  return { summary: String(parsed.summary || "Promptronix identified the missing details for this idea.").slice(0, 240), questions };
}

export async function runPipeline({ idea, options = {}, generate }) {
  if (typeof idea !== "string" || idea.trim().length < 3) throw new Error("Please provide a project idea with at least 3 characters.");
  if (typeof generate !== "function") throw new Error("The prompt generation function is unavailable.");
  const normalizedOptions = {
    targetTool: options.targetTool || "Unspecified", mode: options.mode || "ai",
    skillLevel: options.skillLevel || "Not specified", userRole: options.userRole || "Not specified",
    targetAudience: options.targetAudience || "Not specified", purpose: options.purpose || "Not specified",
    complexity: options.complexity || "AI_DECIDE", expectedOutput: options.expectedOutput || "AI_DECIDE",
    outputLanguage: options.outputLanguage || "en", stack: options.stack || "AI_DECIDE",
    database: options.database || "AI_DECIDE", auth: options.auth || "AI_DECIDE",
    deployment: options.deployment || "AI_DECIDE", model: options.model || "AI_DECIDE",
    dynamicAnswers: options.dynamicAnswers || {}, dynamicQuestions: options.dynamicQuestions || [],
  };
  let nvidiaSkills;
  try { nvidiaSkills = await getNvidiaSkillGuidance({ idea: idea.trim(), options: normalizedOptions }); }
  catch { nvidiaSkills = { relevant: false, message: "NVIDIA skill lookup was unavailable; generation continued with the built-in prompt-engineering framework.", skills: [], guidance: "" }; }
  const system = buildFastSystem(normalizedOptions) + (nvidiaSkills.guidance ? "\n\n" + nvidiaSkills.guidance : "");
  const rawPrompt = await generate({ system, input: buildFastInput({ idea: idea.trim(), options: normalizedOptions }) });
  const prompt = String(rawPrompt || "").trim();
  if (!prompt) throw new Error("The AI model returned an empty prompt. Please try again.");
  return {
    analysis: { understood_summary: "Prompt context prepared from your idea, selected audience, purpose, platform and adaptive answers.", target_platform: normalizedOptions.targetTool, target_audience: normalizedOptions.targetAudience },
    prompt, validation: validatePrompt(prompt), generationMode: "context-aware",
    nvidiaSkills: { message: nvidiaSkills.message, skills: nvidiaSkills.skills },
  };
}