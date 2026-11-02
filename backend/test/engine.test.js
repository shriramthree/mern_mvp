// Offline tests for the fast one-request prompt pipeline. No API key needed.
import assert from "node:assert/strict";
import { runPipeline, validatePrompt, REQUIRED_SECTIONS, buildFastSystem } from "../promptEngine.js";

const fullPrompt = REQUIRED_SECTIONS.map((label, index) => `## ${index + 1}. ${label}\ncontent`).join("\n\n");

// 1) All 17 required headings validate; a missing functional section is detected.
assert.equal(REQUIRED_SECTIONS.length, 17);
assert.equal(validatePrompt(fullPrompt).ok, true);
const noFunctional = fullPrompt.replace(/## 6\. FUNCTIONAL REQUIREMENTS\ncontent\n\n/, "");
assert.deepEqual(validatePrompt(noFunctional).missing, ["FUNCTIONAL REQUIREMENTS"]);

// 2) A complete generation makes exactly ONE model request.
const calls = [];
const idea = "விவசாயிகளுக்கு பயிர் விலை செயலி";
const out = await runPipeline({
  idea,
  options: { targetTool: "Cursor", outputLanguage: "en", skillLevel: "Beginner" },
  generate: async (args) => {
    calls.push(args);
    return fullPrompt;
  },
});
assert.equal(calls.length, 1, "fast mode must call Gemini once, not twice or three times");
assert.equal(out.validation.ok, true);
assert.equal(out.analysis, null);
assert.ok(calls[0].input.includes(idea), "original Tamil idea must be preserved in the model input");
assert.ok(calls[0].system.includes("700-1,000 words"), "fast mode should request a concise prompt");
assert.ok(calls[0].system.includes("Cursor"), "selected target tool must affect the prompt");

// 3) Fast mode uses Tamil output instructions when selected.
assert.ok(buildFastSystem({ outputLanguage: "ta" }).includes("Tamil script"));
assert.ok(buildFastSystem({ outputLanguage: "en" }).includes("professional English"));

// 4) Invalid input is rejected before any model call.
let called = false;
await assert.rejects(
  runPipeline({ idea: " ", options: {}, generate: async () => { called = true; return fullPrompt; } }),
  /at least 3 characters/
);
assert.equal(called, false);

console.log("✅ all fast prompt-engine tests passed");
