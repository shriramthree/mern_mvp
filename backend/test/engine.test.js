// Offline test: stubs Gemini so the pipeline logic can be verified without an API key.
import assert from "node:assert/strict";
import { runPipeline, validatePrompt, REQUIRED_SECTIONS, buildComposeSystem } from "../promptEngine.js";

const fullPrompt = REQUIRED_SECTIONS.map((s, i) => `## ${i + 1}. ${s.label}\ncontent`).join("\n\n");
const analysis = {
  detected_language: "tamil", normalized_idea_en: "A farmers' crop price tracker",
  understood_summary: "விவசாயிகளுக்கான விலை கண்காணிப்பு", project_type: "web app", domain: "agriculture",
  problem_statement: "x", target_users: [], core_features: [], implied_features: [], constraints: [],
  edge_cases: [], sensitive_areas: [], suggested_decisions: [], assumptions: [], open_questions: [],
  complexity: "small", confidence: 0.9,
};

// 1) section validator: exact labels, FUNCTIONAL must not be satisfied by NON-FUNCTIONAL
assert.equal(validatePrompt(fullPrompt).ok, true);
const noFunctional = fullPrompt.replace(/## 6\\. FUNCTIONAL REQUIREMENTS\ncontent\n\n/, "");
assert.deepEqual(validatePrompt(noFunctional).missing, ["FUNCTIONAL REQUIREMENTS"]);

// 2) happy path = exactly 2 model calls
let calls = [];
let out = await runPipeline({
  idea: "விவசாயிகளுக்கு பயிர் விலை செயலி", options: { targetTool: "Cursor", outputLanguage: "en" },
  generate: async (a) => { calls.push(a); return a.schema ? JSON.stringify(analysis) : fullPrompt; },
});
assert.equal(calls.length, 2);
assert.equal(out.validation.ok, true);
assert.equal(out.analysis.detected_language, "tamil");
assert.ok(calls[1].input.includes("விவசாயிகளுக்கு"), "original Tamil text must reach the compose stage");

// 3) incomplete draft triggers exactly one repair call
calls = [];
out = await runPipeline({
  idea: "todo app", options: {},
  generate: async (a) => {
    calls.push(a);
    if (a.schema) return "```json\n" + JSON.stringify(analysis) + "\n```";
    return calls.length === 2 ? "## 1. ROLE & PERSONA\nonly this" : fullPrompt;
  },
});
assert.equal(calls.length, 3);
assert.equal(out.validation.ok, true);
assert.ok(calls[2].input.includes("missing these sections"));

// 4) output-language and tool switches reach the system prompt
assert.ok(buildComposeSystem({ targetTool: "Cursor", outputLanguage: "ta" }).includes("Tamil script"));
assert.ok(buildComposeSystem({ targetTool: "Cursor", outputLanguage: "en" }).includes("Cursor"));

console.log("✅ all engine tests passed");
