// Offline tests for adaptive discovery and the context-aware prompt pipeline.
import assert from "node:assert/strict";
import {
  runPipeline,
  runDiscovery,
  validatePrompt,
  REQUIRED_SECTIONS,
  buildFastSystem,
  buildFastInput,
  DISCOVERY_RESPONSE_SCHEMA,
} from "../promptEngine.js";

const fullPrompt = REQUIRED_SECTIONS.map((label, index) => "## " + (index + 1) + ". " + label + "\ncontent").join("\n\n");

// Required prompt sections are checked locally.
assert.equal(REQUIRED_SECTIONS.length, 17);
assert.equal(validatePrompt(fullPrompt).ok, true);
const noFunctional = fullPrompt.replace(/## 6\. FUNCTIONAL REQUIREMENTS\ncontent\n\n/, "");
assert.deepEqual(validatePrompt(noFunctional).missing, ["FUNCTIONAL REQUIREMENTS"]);

// Prompt construction carries the creator, audience, platform and dropdown context.
const calls = [];
const idea = "A web app that helps farmers identify crop diseases";
const out = await runPipeline({
  idea,
  options: {
    targetTool: "Lovable",
    outputLanguage: "en",
    skillLevel: "Beginner",
    userRole: "Student",
    targetAudience: "Farmers / local communities",
    purpose: "Build a web application",
    dynamicAnswers: { backendChoice: "Supabase", authChoice: "Email and password" },
    dynamicQuestions: [
      { id: "backendChoice", label: "Which backend should the app use?" },
      { id: "authChoice", label: "Does the product need user accounts?" },
    ],
  },
  generate: async (args) => {
    calls.push(args);
    return fullPrompt;
  },
});
assert.equal(calls.length, 1, "prompt generation must use one model call");
assert.equal(out.validation.ok, true);
assert.equal(out.analysis.target_platform, "Lovable");
assert.equal(out.analysis.target_audience, "Farmers / local communities");
assert.ok(calls[0].input.includes(idea), "the original idea must be preserved");
assert.ok(calls[0].input.includes("Prompt creator role: Student"));
assert.ok(calls[0].input.includes("Target audience: Farmers / local communities"));
assert.ok(calls[0].input.includes("Which backend should the app use?: Supabase"));
assert.ok(calls[0].system.includes("Lovable"), "selected platform must influence prompt instructions");
assert.ok(calls[0].system.includes("PROMPT ENGINEERING METHOD"));

// Tamil output and platform-neutral instructions are supported.
assert.ok(buildFastSystem({ outputLanguage: "ta" }).includes("Tamil script"));
assert.ok(buildFastSystem({ outputLanguage: "en" }).includes("professional English"));
assert.ok(buildFastSystem({ targetTool: "GitHub Spark" }).includes("GitHub Spark"));
assert.ok(buildFastInput({ idea, options: { targetTool: "Replit" } }).includes("Replit"));

// Adaptive discovery only returns bounded dropdown choices, not free-response prompts.
let discoveryCall;
const discovery = await runDiscovery({
  idea,
  options: { targetTool: "Replit", userRole: "Student", purpose: "Build a web application" },
  generate: async (args) => {
    discoveryCall = args;
    return JSON.stringify({
      summary: "Two details will help scope the app.",
      questions: [
        { id: "dataStorage", label: "How should data be stored?", helperText: "Choose the closest option.", required: true, options: ["Supabase", "Firebase", "AI decide"] },
        { id: "delivery", label: "What should be delivered?", required: false, options: ["Working MVP", "Frontend prototype", "Architecture plan"] },
      ],
    });
  },
});
assert.equal(discovery.questions.length, 2);
assert.equal(discovery.questions[0].required, true);
assert.equal(discovery.questions[0].options.length, 3);
assert.equal(discoveryCall.schema.type, DISCOVERY_RESPONSE_SCHEMA.type);

// Invalid inputs are rejected before a model call.
let called = false;
await assert.rejects(
  runPipeline({ idea: " ", options: {}, generate: async () => { called = true; return fullPrompt; } }),
  /at least 3 characters/
);
assert.equal(called, false);

console.log("✅ all adaptive prompt-engine tests passed");
