import { useRef, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const SELECT = "w-full p-3 mb-4 rounded-xl border border-gray-300 bg-white";

function App() {
  const [stack, setStack] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tools, setTools] = useState("");
  const [mode, setMode] = useState("ai");

  const [deployment, setDeployment] = useState("");
  const [auth, setAuth] = useState("");
  const [model, setModel] = useState("");
  const [database, setDatabase] = useState("");

  // user background (helps the system calibrate the prompt)
  const [skillLevel, setSkillLevel] = useState("");
  const [purpose, setPurpose] = useState("");
  const [outputLanguage, setOutputLanguage] = useState("en");

  const [result, setResult] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const lastTranscriptRef = useRef("");

  // 🚀 Send the idea to the backend: Gemini analyses it (English/Tamil/Tanglish), then writes the full prompt
  const handleSubmit = async () => {
    if (isGenerating) return;
    if (prompt.trim().length < 3) {
      setError("Please describe your idea first.");
      return;
    }
    setError("");
    setCopied(false);
    setIsGenerating(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/generate`, {
        prompt,
        tools,
        mode,
        stack,
        deployment,
        auth,
        model,
        database,
        skillLevel,
        purpose,
        outputLanguage,
      });
      setResult(data.result);
      setAnalysis(data.analysis || null);
      setValidation(data.validation || null);
    } catch (err) {
      setResult("");
      setAnalysis(null);
      setError(err.response?.data?.error || "Could not reach the server. Check that the backend is running.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed. Select the text and copy it manually.");
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

  const list = (items) => (items || []).filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f4ef] via-[#f5efe8] to-[#efe7dc] flex justify-center items-start py-12 px-4 text-gray-800">
      <div className="w-full max-w-2xl bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-md border border-gray-200">
        {/* TITLE */}
        <h1 className="text-4xl font-bold mb-2 text-center text-orange-500">Prompt Generator</h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          Write your idea in simple English or Tamil. We analyse it and build a complete, structured prompt.
        </p>

        {/* IDEA + VOICE TYPING */}
        <label htmlFor="project-idea" className="block mb-2 font-medium text-gray-700">
          Describe your idea
        </label>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <textarea
            id="project-idea"
            rows={4}
            placeholder="e.g. A website where farmers can see daily crop prices  /  விவசாயிகளுக்கான பயிர் விலை செயலி"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={4000}
            className="min-w-0 flex-1 p-3 rounded-xl border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            aria-pressed={isListening}
            className={"shrink-0 px-4 py-3 rounded-xl font-semibold transition-colors self-start " + (isListening ? "bg-red-500 hover:bg-red-600 text-white" : "bg-orange-100 hover:bg-orange-200 text-orange-700")}
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
        {voiceError && <p className="mb-4 text-sm text-red-600" role="alert">{voiceError}</p>}

        {/* ABOUT YOU */}
        <div className="grid sm:grid-cols-2 gap-x-4">
          <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className={SELECT} aria-label="Your skill level">
            <option value="">Your skill level</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Expert</option>
          </select>
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)} className={SELECT} aria-label="Purpose">
            <option value="">What is this for?</option>
            <option>College project</option>
            <option>Startup MVP</option>
            <option>Portfolio</option>
            <option>Client work</option>
            <option>Learning</option>
            <option>Research</option>
          </select>
        </div>

        {/* TOOLS */}
        <select value={tools} onChange={(e) => setTools(e.target.value)} className={SELECT} aria-label="Target AI tool">
          <option value="">Which AI tool will run this prompt?</option>
          <option value="Gemini">Gemini</option>
          <option value="Claude">Claude</option>
          <option value="Replit">Replit</option>
          <option value="Cursor">Cursor</option>
        </select>

        {/* OUTPUT LANGUAGE */}
        <select value={outputLanguage} onChange={(e) => setOutputLanguage(e.target.value)} className={SELECT} aria-label="Prompt language">
          <option value="en">Write the final prompt in English (recommended)</option>
          <option value="ta">Write the final prompt in Tamil</option>
        </select>

        {/* MODE */}
        <select value={mode} onChange={(e) => setMode(e.target.value)} className={SELECT} aria-label="Mode">
          <option value="ai">AI Decide Everything</option>
          <option value="customize">Customize</option>
        </select>

        {/* CUSTOM OPTIONS */}
        {mode === "customize" && (
          <>
            <select value={stack} onChange={(e) => setStack(e.target.value)} className={SELECT}>
              <option value="">Select Stack</option>
              <option value="MERN">MERN Stack</option>
              <option value="MEAN">MEAN Stack</option>
              <option value="LAMP">LAMP Stack</option>
              <option value="JAMstack">JAMstack</option>
              <option value="Full Stack">Full Stack</option>
            </select>

            <select value={deployment} onChange={(e) => setDeployment(e.target.value)} className={SELECT}>
              <option value="">Deployment</option>
              <option>Vercel</option>
              <option>AWS</option>
              <option>Render</option>
            </select>

            <select value={auth} onChange={(e) => setAuth(e.target.value)} className={SELECT}>
              <option value="">Auth</option>
              <option>JWT</option>
              <option>Firebase</option>
            </select>

            <select value={model} onChange={(e) => setModel(e.target.value)} className={SELECT}>
              <option value="">Model</option>
              <option>OpenAI</option>
              <option>Gemini</option>
              <option>Claude</option>
            </select>

            <select value={database} onChange={(e) => setDatabase(e.target.value)} className={SELECT}>
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
              Analysing your idea and building the prompt...
            </span>
          ) : (
            "Generate"
          )}
        </button>

        {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}

        {/* WHAT WE UNDERSTOOD */}
        {analysis && (
          <div className="mt-6 p-4 rounded-xl bg-orange-50 border border-orange-200 text-sm">
            <p className="font-semibold text-orange-700 mb-1">What I understood</p>
            <p className="mb-2">{analysis.understood_summary}</p>
            <p className="text-gray-600">
              Language: <b>{analysis.detected_language}</b> · Type: <b>{analysis.project_type}</b> · Complexity: <b>{analysis.complexity}</b>
              {typeof analysis.confidence === "number" && <> · Confidence: <b>{Math.round(analysis.confidence * 100)}%</b></>}
            </p>
            {list(analysis.open_questions).length > 0 && (
              <div className="mt-3">
                <p className="font-semibold text-orange-700">Answer these to make the prompt sharper:</p>
                <ul className="list-disc pl-5 text-gray-700">
                  {list(analysis.open_questions).map((q) => <li key={q}>{q}</li>)}
                </ul>
                <p className="text-xs text-gray-500 mt-1">Add your answers to the idea box and press Generate again.</p>
              </div>
            )}
          </div>
        )}

        {validation && !validation.ok && (
          <p className="mt-3 text-sm text-amber-700" role="status">
            Some sections may be incomplete: {validation.missing.join(", ")}. Try generating again.
          </p>
        )}

        {/* RESULT */}
        {result && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold text-gray-700">Your prompt</h2>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1 text-sm rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 font-semibold"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <div className="p-4 rounded-xl bg-gray-100 border border-gray-200 max-h-[32rem] overflow-auto">
              <pre className="text-sm whitespace-pre-wrap text-gray-800">{result}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
