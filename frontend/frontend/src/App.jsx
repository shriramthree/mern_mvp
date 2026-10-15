import { useRef, useState } from "react";

function App() {
  const [stack, setStack] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tools, setTools] = useState("");
  const [mode, setMode] = useState("ai");

  const [deployment, setDeployment] = useState("");
  const [auth, setAuth] = useState("");
  const [model, setModel] = useState("");
  const [database, setDatabase] = useState("");

  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const lastTranscriptRef = useRef("");

  // 🧠 SMART PROMPT GENERATOR — Prime, Persona, Product, Privacy, Polish
  const generatePromptLocally = () => {
    const idea = prompt.trim();
    if (!idea) return "Please enter your project idea before generating a prompt.";

    let stackText = stack || "the most suitable modern technology stack";
    let toolText = tools || "appropriate industry-standard development tools";

    if (stack === "MERN") {
      stackText = "MongoDB, Express.js, React, and Node.js";
    } else if (stack === "MEAN") {
      stackText = "MongoDB, Express.js, Angular, and Node.js";
    } else if (stack === "LAMP") {
      stackText = "Linux, Apache, MySQL, and PHP";
    } else if (stack === "JAMstack") {
      stackText = "JavaScript, APIs, and Markup";
    }

    return `
🚀 PROJECT PROMPT — PRIME FRAMEWORK

Use the following five-part framework. Follow every section explicitly and produce a practical, implementation-ready result.

1. PRIME — BACKGROUND, CONTEXT & SCENARIO
Project idea: "${idea}"
Explain the problem being solved, intended users, use cases, operating context, assumptions, and scope. If critical information is missing, state reasonable assumptions clearly rather than inventing facts. Keep the solution aligned with the actual idea.

2. PERSONA — EXPERT ROLE & POINT OF VIEW
Act as a senior product architect, experienced software engineer, UI/UX designer, and security-conscious technical lead. Use a clear, professional, practical tone. Make decisions that prioritize usability, accessibility, maintainability, reliability, and a polished user experience.

3. PRODUCT — TASK, GOALS & REQUIRED DELIVERABLES
Create a complete, detailed plan and implementation for the project described above. Use ${stackText} as the technology stack and ${toolText} as the preferred development tool(s).
Authentication: ${auth || "recommend an appropriate approach only if the project needs it"}.
Database: ${database || "choose and justify a suitable database based on the requirements"}.
Deployment: ${deployment || "recommend a suitable deployment option and explain the setup"}.
${model ? `AI integration: use ${model} where it clearly benefits the project.` : "AI integration: include it only when it adds clear value to the project."}
Include: requirements and key features; architecture and folder structure; data model and API design where applicable; responsive and accessible UI; validation and error handling; security considerations; setup instructions; environment-variable guidance; testing strategy; and deployment steps. Provide working, consistent code or concrete implementation steps where requested. Do not leave placeholder functions or omit essential files without explaining why.

4. PRIVACY — SAFETY, DATA & CONSTRAINTS
Use secure defaults. Never expose, invent, or hard-code API keys, passwords, access tokens, private user data, or secrets. Use environment variables for credentials. Collect only necessary data, validate inputs, protect sensitive information, and explain any relevant privacy or security trade-offs. Respect the selected stack and stated constraints; do not claim that unimplemented features have been completed.

5. POLISH — REVIEW, REFINEMENT & FINAL QUALITY
Before presenting the result, check that it directly satisfies the idea, all sections are consistent, code and commands fit the chosen stack, and no essential steps are missing. Improve clarity, structure, naming, accessibility, responsive behavior, and error handling. Format the response with meaningful headings, numbered steps, code blocks, and a concise verification checklist. Identify assumptions and limitations honestly, and suggest focused follow-up improvements only where useful.

FINAL INSTRUCTION
Deliver a cohesive, production-minded result tailored to the project idea. Prioritize correctness and completeness over unnecessary complexity. If the request is ambiguous, ask only essential clarifying questions or proceed with clearly stated assumptions.
`;
  };
  // 🚀 HANDLE SUBMIT — show loading for at least 2 seconds
  const handleSubmit = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    const startedAt = Date.now();
    try {
      const output = generatePromptLocally();
      const remaining = Math.max(0, 2000 - (Date.now() - startedAt));
      if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
      setResult(output);
    } finally {
      setIsGenerating(false);
    }
  };

  // 🎙️ VOICE-TO-TYPE using the browser Web Speech API
  const handleVoiceInput = () => {
    setVoiceError("");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError("Voice typing is not supported in this browser. Try the latest Chrome or Edge.");
      return;
    }

    if (isListening) {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    shouldKeepListeningRef.current = true;
    lastTranscriptRef.current = "";
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = speechLanguage;
    // Continue listening across pauses until the user presses Stop.
    recognition.continuous = true;
    // Only accept finalized speech results to avoid inserting unstable guesses.
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      // Process only new, final results. Never reuse results[0], which can be stale.
      const finalChunks = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const item = event.results[i];
        if (item.isFinal) {
          const alternative = item[0];
          const transcript = alternative?.transcript?.trim();
          const confidence = alternative?.confidence;
          // Ignore weak recognition guesses when the browser exposes confidence.
          if (!transcript || (typeof confidence === "number" && confidence > 0 && confidence < 0.65)) continue;
          // Prevent an identical final phrase from being inserted twice after a restart.
          if (transcript === lastTranscriptRef.current) continue;
          lastTranscriptRef.current = transcript;
          finalChunks.push(transcript);
        }
      }
      if (finalChunks.length) {
        const transcript = finalChunks.join(" ");
        setPrompt((current) => current ? current + " " + transcript : transcript);
      }
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldKeepListeningRef.current = false;
        setVoiceError("Microphone access was blocked. Allow microphone access in your browser settings and try again.");
        setIsListening(false);
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setVoiceError("Speech recognition was interrupted. Trying to reconnect…");
      }
    };
    recognition.onend = () => {
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
        } catch {
          shouldKeepListeningRef.current = false;
          setIsListening(false);
          setVoiceError("Voice typing could not resume. Press Voice type to try again.");
        }
      } else {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceError("Could not start voice typing. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f4ef] via-[#f5efe8] to-[#efe7dc] flex justify-center items-start pt-16 px-4 text-gray-800">

      <div className="w-full max-w-2xl bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-md border border-gray-200">

        {/* TITLE */}
        <h1 className="text-4xl font-bold mb-6 text-center text-orange-500">
          Prompt Generator
        </h1>

        {/* PROMPT + VOICE TYPING */}
        <label htmlFor="project-idea" className="block mb-2 font-medium text-gray-700">
          Describe your idea
        </label>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <input
            id="project-idea"
            type="text"
            placeholder="Describe your idea..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-w-0 flex-1 p-3 rounded-xl border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            aria-pressed={isListening}
            className={"shrink-0 px-4 py-3 rounded-xl font-semibold transition-colors " + (isListening ? "bg-red-500 hover:bg-red-600 text-white" : "bg-orange-100 hover:bg-orange-200 text-orange-700")}
          >
            {isListening ? "■ Stop listening" : "🎙️ Voice type"}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
          <label htmlFor="speech-language" className="text-gray-600">Voice language:</label>
          <select
            id="speech-language"
            value={speechLanguage}
            onChange={(e) => setSpeechLanguage(e.target.value)}
            disabled={isListening}
            className="p-2 rounded-lg border border-gray-300 bg-white"
          >
            <option value="en-IN">English (India)</option>
            <option value="ta-IN">Tamil (India)</option>
          </select>
          {isListening && <span className="text-red-600" role="status" aria-live="polite">Listening… speak now</span>}
        </div>
        {voiceError && (
          <p className="mb-4 text-sm text-red-600" role="alert">{voiceError}</p>
        )}

        {/* TOOLS */}
        <select
          value={tools}
          onChange={(e) => setTools(e.target.value)}
          className="w-full p-3 mb-4 rounded-xl border border-gray-300"
        >
          <option value="">Select Tool</option>
          <option value="Gemini">Gemini</option>
          <option value="Claude">Claude</option>
          <option value="Replit">Replit</option>
          <option value="Cursor">Cursor</option>
        </select>

        {/* MODE */}
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="w-full p-3 mb-4 rounded-xl border border-gray-300"
        >
          <option value="ai">AI Decide Everything</option>
          <option value="customize">Customize</option>
        </select>

        {/* CUSTOM OPTIONS */}
        {mode === "customize" && (
          <>
            <select
              value={stack}
              onChange={(e) => setStack(e.target.value)}
              className="w-full p-3 mb-4 rounded-xl border border-gray-300"
            >
              <option value="">Select Stack</option>
              <option value="MERN">MERN Stack</option>
              <option value="MEAN">MEAN Stack</option>
              <option value="LAMP">LAMP Stack</option>
              <option value="JAMstack">JAMstack</option>
              <option value="Full Stack">Full Stack</option>
            </select>

            <select
              onChange={(e) => setDeployment(e.target.value)}
              className="w-full p-3 mb-4 rounded-xl border border-gray-300"
            >
              <option value="">Deployment</option>
              <option>Vercel</option>
              <option>AWS</option>
              <option>Render</option>
            </select>

            <select
              onChange={(e) => setAuth(e.target.value)}
              className="w-full p-3 mb-4 rounded-xl border border-gray-300"
            >
              <option value="">Auth</option>
              <option>JWT</option>
              <option>Firebase</option>
            </select>

            <select
              onChange={(e) => setModel(e.target.value)}
              className="w-full p-3 mb-4 rounded-xl border border-gray-300"
            >
              <option value="">Model</option>
              <option>OpenAI</option>
              <option>Gemini</option>
              <option>Claude</option>
            </select>

            <select
              onChange={(e) => setDatabase(e.target.value)}
              className="w-full p-3 mb-4 rounded-xl border border-gray-300"
            >
              <option value="">Database</option>
              <option>MongoDB</option>
              <option>PostgreSQL</option>
            </select>
          </>
        )}

        {/* BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={isGenerating}
          aria-busy={isGenerating}
          className="w-full mt-2 bg-orange-500 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-80 text-white p-3 rounded-xl font-semibold shadow-lg shadow-orange-500/30 transition-opacity"
        >
          {isGenerating ? (
            <span className="inline-flex items-center justify-center gap-2" role="status" aria-live="polite">
              <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />
              Generating your prompt...
            </span>
          ) : ("Generate")}
        </button>

        {/* RESULT */}
        {result && (
          <div className="mt-6 p-4 rounded-xl bg-gray-100 border border-gray-200 max-h-64 overflow-auto">
            <pre className="text-sm whitespace-pre-wrap text-gray-800">
              {result}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;