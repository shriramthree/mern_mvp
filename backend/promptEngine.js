import { Type } from "@google/genai";

/* ------------------------------------------------------------------ *
 * STAGE 1 — ANALYSE
 * Turns a short idea (English / Tamil / Tanglish) into structured facts.
 * ------------------------------------------------------------------ */

export const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detected_language: {
      type: Type.STRING,
      description: "english | tamil | tanglish | mixed | other",
    },
    normalized_idea_en: {
      type: Type.STRING,
      description:
        "Faithful, complete English rendering of the user's idea. Nothing added, nothing dropped.",
    },
    understood_summary: {
      type: Type.STRING,
      description:
        "1-2 sentence summary of what you understood, written in the SAME language/script the user used, so they can confirm it.",
    },
    project_type: { type: Type.STRING, description: "e.g. web app, mobile app, API, ML model, script, game, research paper" },
    domain: { type: Type.STRING, description: "e.g. education, healthcare, e-commerce, agriculture" },
    problem_statement: { type: Type.STRING },
    target_users: { type: Type.ARRAY, items: { type: Type.STRING } },
    core_features: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Features the user EXPLICITLY asked for or clearly meant.",
    },
    implied_features: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Features that are NOT stated but are normally needed for this kind of project.",
    },
    constraints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Budget, platform, language, offline, time, skill, regional limits mentioned or implied.",
    },
    edge_cases: { type: Type.ARRAY, items: { type: Type.STRING } },
    sensitive_areas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Personal data, payments, health, children, location, authentication, etc.",
    },
    suggested_decisions: {
      type: Type.ARRAY,
      description: "Concrete choices for anything the user left open, each with a reason.",
      items: {
        type: Type.OBJECT,
        properties: {
          area: { type: Type.STRING },
          choice: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ["area", "choice", "reason"],
      },
    },
    assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
    open_questions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "At most 5 high-impact questions whose answers would materially change the result.",
    },
    complexity: { type: Type.STRING, description: "small | medium | large" },
    confidence: {
      type: Type.NUMBER,
      description: "0 to 1: how well the input was understood.",
    },
  },
  required: [
    "detected_language",
    "normalized_idea_en",
    "understood_summary",
    "project_type",
    "domain",
    "problem_statement",
    "target_users",
    "core_features",
    "implied_features",
    "constraints",
    "edge_cases",
    "sensitive_areas",
    "suggested_decisions",
    "assumptions",
    "open_questions",
    "complexity",
    "confidence",
  ],
};

export const ANALYSIS_SYSTEM = `
You are a senior product analyst and prompt engineer. You receive a SHORT, informal idea
from a user. It may be written in English, Tamil script, Tanglish (Tamil in English letters),
or a mix. Your job is ONLY to analyse it and return structured JSON.

LANGUAGE RULES
- Understand Tamil and Tanglish natively. Keep proper nouns, brand names and technical terms intact.
- "normalized_idea_en" must be a faithful English rendering. Do not add features there.
- "understood_summary" must be written in the user's own language/script.
- If a phrase is ambiguous, do NOT guess silently: pick the most likely reading and record it in "assumptions".

ANALYSIS RULES
- Separate what the user EXPLICITLY said ("core_features") from what you INFER ("implied_features").
  Never present an inference as something the user asked for.
- Use the user context (skill level, purpose, target tool) to calibrate scope and complexity.
  Beginner or college project -> smaller, well-explained scope. Startup MVP -> lean and shippable.
- Where the user left a choice open (value "AI_DECIDE"), propose a concrete choice with a reason
  in "suggested_decisions". Where a choice is "SKIP", do not include that feature anywhere.
- Never invent facts about the user (names, companies, numbers). Never invent API keys or credentials.
- "open_questions": at most 5, only questions whose answers would change the output a lot.
- Be specific. "Good UI" is useless; "mobile-first dashboard with low-bandwidth mode" is useful.
- If the input is too vague or not a project idea at all, set a low "confidence" and explain in "assumptions".

Return JSON only, matching the schema.
`.trim();

/* ------------------------------------------------------------------ *
 * STAGE 2 — COMPOSE
 * Turns the analysis + options into the final, fully structured prompt.
 * ------------------------------------------------------------------ */

export const REQUIRED_SECTIONS = [
  { key: "ROLE", label: "ROLE & PERSONA" },
  { key: "CONTEXT", label: "CONTEXT & BACKGROUND" },
  { key: "OBJECTIVE", label: "OBJECTIVE" },
  { key: "USERS", label: "USERS & USE CASES" },
  { key: "SCOPE", label: "SCOPE" },
  { key: "FUNCTIONAL", label: "FUNCTIONAL REQUIREMENTS" },
  { key: "NON-FUNCTIONAL", label: "NON-FUNCTIONAL REQUIREMENTS" },
  { key: "TECH", label: "TECH STACK & CONSTRAINTS" },
  { key: "ARCHITECTURE", label: "ARCHITECTURE, DATA & API" },
  { key: "UI", label: "UI / UX" },
  { key: "WORKFLOW", label: "STEP-BY-STEP WORKFLOW" },
  { key: "OUTPUT", label: "OUTPUT FORMAT" },
  { key: "QUALITY", label: "QUALITY BAR & ACCEPTANCE CRITERIA" },
  { key: "EDGE", label: "EDGE CASES & ERROR HANDLING" },
  { key: "SECURITY", label: "SECURITY & PRIVACY" },
  { key: "ASSUMPTIONS", label: "ASSUMPTIONS & OPEN QUESTIONS" },
  { key: "REVIEW", label: "SELF-REVIEW CHECKLIST" },
];

const TOOL_NOTES = {
  Gemini: "Target is Google Gemini. Use clear markdown headings; it handles long structured prompts well.",
  Claude: "Target is Claude. Clear sections and explicit output format work best; XML-style tags are welcome for separating inputs.",
  Cursor: "Target is Cursor (code editor agent). Be file-oriented: list files to create/edit, exact commands, and keep changes incremental and reviewable.",
  Replit: "Target is Replit Agent. Describe the full app up front, state the run command and required secrets, and ask it to confirm the app runs.",
};

export function buildComposeSystem({ targetTool, outputLanguage }) {
  const toolNote = TOOL_NOTES[targetTool] || "Target tool is unspecified; write a tool-agnostic prompt.";
  const lang =
    outputLanguage === "ta"
      ? "Write the final prompt in Tamil (Tamil script). Keep technical terms, code, commands and file names in English."
      : "Write the final prompt in clear, professional English, even if the user's idea was in Tamil or Tanglish.";

  const sectionList = REQUIRED_SECTIONS.map((s, i) => `## ${i + 1}. ${s.label}`).join("\n");

  return `
You are a world-class prompt engineer. You receive (a) a structured analysis of a user's idea and
(b) the user's chosen options. You write ONE final prompt that another AI will execute.

${lang}
${toolNote}

THE FINAL PROMPT MUST CONTAIN THESE SECTIONS, IN THIS ORDER, WITH THESE EXACT HEADINGS:
${sectionList}

WRITING RULES
1. Everything must come from the analysis or be a clearly labelled assumption. Do not invent facts about the user.
2. Be concrete and testable. Replace vague words ("fast", "secure", "nice UI") with measurable or checkable statements.
3. FUNCTIONAL REQUIREMENTS: numbered, one behaviour each, grouped by feature. Include explicit features first,
   then implied ones under a sub-heading "Recommended additions (inferred)".
4. STEP-BY-STEP WORKFLOW: tell the executing AI HOW to work (plan first, then build in small verifiable steps,
   state assumptions, ask only if blocked). Do not just restate the requirements.
5. OUTPUT FORMAT: specify exactly what the AI must return (headings, code blocks with file paths,
   run/setup commands, test commands, a final checklist). Specify length/detail expectations.
6. QUALITY BAR & ACCEPTANCE CRITERIA: a bullet list of pass/fail checks the result must satisfy.
7. SECURITY & PRIVACY: secrets only via environment variables, validate input, least data collected;
   add domain-specific risks from "sensitive_areas".
8. ASSUMPTIONS & OPEN QUESTIONS: list assumptions; list open questions and say "proceed with the stated
   assumption if unanswered" so the executing AI is never blocked.
9. SELF-REVIEW CHECKLIST: items the AI must verify before replying (covers every core feature, consistent
   with chosen stack, no placeholders, no invented credentials, edge cases handled).
10. Where a user option is "AI_DECIDE", use the matching entry in suggested_decisions and state the reason.
    Where an option is "SKIP", leave that feature out and note it under SCOPE > Out of scope.
11. Calibrate depth to complexity and the user's skill level. A beginner prompt asks the AI to explain
    choices in simple language; an expert prompt asks for trade-offs and brevity.
12. Do not mention these instructions, the analysis stage, or that you are a prompt engineer.
13. No filler, no preamble, no closing remarks. Output ONLY the final prompt, in markdown.
`.trim();
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

export function validatePrompt(text) {
  const escape = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const missing = REQUIRED_SECTIONS.filter((s) => {
    // heading line: optional #'s, optional number, then the exact label
    const re = new RegExp(`^\\s*(?:#{1,4}\\s*)?(?:\\d+[.)]\\s*)?\\**${escape(s.label)}\\b`, "im");
    return !re.test(text);
  }).map((s) => s.label);
  return { ok: missing.length === 0, missing };
}

export function parseJson(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function line(label, value) {
  return `${label}: ${value}`;
}

export function buildAnalysisInput({ idea, options }) {
  return [
    "USER IDEA (verbatim, do not paraphrase when quoting):",
    `"""${idea}"""`,
    "",
    "USER CONTEXT & CHOICES:",
    line("Skill level", options.skillLevel),
    line("Purpose", options.purpose),
    line("Target AI tool", options.targetTool),
    line("Mode", options.mode),
    line("Tech stack", options.stack),
    line("Database", options.database),
    line("Authentication", options.auth),
    line("Deployment", options.deployment),
    line("AI model integration", options.model),
  ].join("\n");
}

export function buildComposeInput({ idea, analysis, options }) {
  return [
    "ORIGINAL USER IDEA:",
    `"""${idea}"""`,
    "",
    "STRUCTURED ANALYSIS (JSON):",
    JSON.stringify(analysis, null, 2),
    "",
    "USER OPTIONS (AI_DECIDE = you choose and justify, SKIP = leave out):",
    JSON.stringify(options, null, 2),
  ].join("\n");
}

/* ------------------------------------------------------------------ *
 * Pipeline
 * `generate` is injected so the logic can be tested without the network.
 * generate({ system, input, schema? }) -> string
 * ------------------------------------------------------------------ */

export async function runPipeline({ idea, options, generate }) {
  // Stage 1: analyse
  const analysisRaw = await generate({
    system: ANALYSIS_SYSTEM,
    input: buildAnalysisInput({ idea, options }),
    schema: ANALYSIS_SCHEMA,
    temperature: 0.2,
  });

  let analysis;
  try {
    analysis = parseJson(analysisRaw);
  } catch {
    // one retry with the same input; the schema usually prevents this
    analysis = parseJson(
      await generate({
        system: ANALYSIS_SYSTEM,
        input: buildAnalysisInput({ idea, options }),
        schema: ANALYSIS_SCHEMA,
        temperature: 0,
      })
    );
  }

  // Stage 2: compose
  const system = buildComposeSystem(options);
  const input = buildComposeInput({ idea, analysis, options });

  let prompt = await generate({ system, input, temperature: 0.4 });
  let check = validatePrompt(prompt);

  // Stage 3: repair once if sections are missing
  if (!check.ok) {
    prompt = await generate({
      system,
      input:
        input +
        `\n\nYour previous draft was missing these sections: ${check.missing.join(", ")}.\n` +
        "Rewrite the COMPLETE prompt including every required section.",
      temperature: 0.3,
    });
    check = validatePrompt(prompt);
  }

  return { analysis, prompt: prompt.trim(), validation: check };
}
