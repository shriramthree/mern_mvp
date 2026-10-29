import { useRef, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [stack, setStack] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tools, setTools] = useState("Replit");
  const [mode, setMode] = useState("ai");
  const [deployment, setDeployment] = useState("");
  const [auth, setAuth] = useState("");
  const [model, setModel] = useState("");
  const [database, setDatabase] = useState("");
  const [outputLanguage, setOutputLanguage] = useState("en");
  const [result, setResult] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const [voiceError, setVoiceError] = useState("");
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const lastTranscriptRef = useRef("");

  const handleSubmit = async () => {
    if (isGenerating) return;
    const idea = prompt.trim();
    if (idea.length < 3) {
      setError("Please describe your project idea using at least 3 characters.");
      return;
    }
    setIsGenerating(true);
    setError("");
    setResult("");
    const startedAt = Date.now();
    try {
      const options = {
        targetTool: tools || "Replit",
        outputLanguage,
        ...(mode === "customize" ? { stack, deployment, auth, model, database } : {}),
      };
      const response = await axios.post(`${API_URL}/api/generate`, { idea, options }, { timeout: 120000 });
      const output = response.data?.prompt;
      if (!output) throw new Error("The server returned an empty prompt. Please try again.");
      const remaining = Math.max(0, 2000 - (Date.now() - startedAt));
      if (remaining) await new Promise((resolve) => window.setTimeout(resolve, remaining));
      setResult(output);
      if (response.data?.validation && !response.data.validation.ok) {
        setError("The prompt was generated, but some required sections may be missing.");
      }
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || "Could not generate the prompt.";
      setError(`${message} Check that the backend is running and VITE_API_URL is configured.`);
    } finally {
      setIsGenerating(false);
    }
  };

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
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const finalChunks = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const item = event.results[i];
        if (!item.isFinal) continue;
        const transcript = item[0]?.transcript?.trim();
        const confidence = item[0]?.confidence;
        if (!transcript || (typeof confidence === "number" && confidence > 0 && confidence < 0.65)) continue;
        if (transcript === lastTranscriptRef.current) continue;
        lastTranscriptRef.current = transcript;
        finalChunks.push(transcript);
      }
      if (finalChunks.length) {
        const transcript = finalChunks.join(" ");
        setPrompt((current) => current ? `${current} ${transcript}` : transcript);
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
        try { recognition.start(); }
        catch {
          shouldKeepListeningRef.current = false;
          setIsListening(false);
          setVoiceError("Voice typing could not resume. Press Voice type to try again.");
        }
      } else {
        setIsListening(false);
      }
    };
    try { recognition.start(); }
    catch {
      shouldKeepListeningRef.current = false;
      setIsListening(false);
      setVoiceError("Could not start voice typing. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f4ef] via-[#f5efe8] to-[#efe7dc] flex justify-center items-start py-10 px-4 text-gray-800">
      <main className="w-full max-w-2xl bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-md border border-gray-200">
        <p className="text-center text-xs font-bold tracking-[0.25em] text-orange-500 uppercase mb-2">Promptronix</p>
        <h1 className="text-4xl font-bold mb-3 text-center text-orange-500">Prompt Generator</h1>
        <p className="text-center text-sm text-gray-500 mb-7">Turn a rough idea into a structured, coding-ready prompt.</p>

        <label htmlFor="project-idea" className="block mb-2 font-medium text-gray-700">Describe your idea</label>
        <textarea
          id="project-idea" rows={4} placeholder="Example: Build a student attendance app with reports..."
          value={prompt} onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-3 rounded-xl border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y"
        />
        <div className="flex flex-wrap items-center gap-2 mt-2 mb-4 text-sm">
          <button type="button" onClick={handleVoiceInput} aria-pressed={isListening}
            className={"px-4 py-2 rounded-xl font-semibold transition-colors " + (isListening ? "bg-red-500 hover:bg-red-600 text-white" : "bg-orange-100 hover:bg-orange-200 text-orange-700")}>
            {isListening ? "■ Stop listening" : "🎙️ Voice type"}
          </button>
          <label htmlFor="speech-language" className="text-gray-600">Voice language:</label>
          <select id="speech-language" value={speechLanguage} onChange={(e) => setSpeechLanguage(e.target.value)} disabled={isListening} className="p-2 rounded-lg border border-gray-300 bg-white">
            <option value="en-IN">English (India)</option><option value="ta-IN">Tamil (India)</option>
          </select>
          {isListening && <span className="text-red-600" role="status" aria-live="polite">Listening…</span>}
        </div>
        {voiceError && <p className="mb-4 text-sm text-red-600" role="alert">{voiceError}</p>}

        <label htmlFor="coding-tool" className="block mb-2 font-medium text-gray-700">AI / coding tool</label>
        <select id="coding-tool" value={tools} onChange={(e) => setTools(e.target.value)} className="w-full p-3 mb-4 rounded-xl border border-gray-300 bg-white">
          <option value="Gemini">Gemini</option><option value="Claude">Claude</option><option value="Replit">Replit</option><option value="Cursor">Cursor</option>
        </select>

        <label htmlFor="mode" className="block mb-2 font-medium text-gray-700">Decision mode</label>
        <select id="mode" value={mode} onChange={(e) => setMode(e.target.value)} className="w-full p-3 mb-4 rounded-xl border border-gray-300 bg-white">
          <option value="ai">AI decides the best setup</option><option value="customize">Customize settings</option>
        </select>

        {mode === "customize" && (
          <section className="rounded-xl border border-orange-100 bg-orange-50/50 p-4 mb-4">
            <h2 className="font-semibold mb-3">Project preferences</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <select aria-label="Technology stack" value={stack} onChange={(e) => setStack(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 bg-white">
                <option value="">Technology stack</option><option value="MERN">MERN Stack</option><option value="MEAN">MEAN Stack</option><option value="LAMP">LAMP Stack</option><option value="JAMstack">JAMstack</option><option value="Full Stack">Full Stack</option>
              </select>
              <select aria-label="Deployment" value={deployment} onChange={(e) => setDeployment(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 bg-white">
                <option value="">Deployment preference</option><option>Vercel</option><option>AWS</option><option>Render</option>
              </select>
              <select aria-label="Authentication" value={auth} onChange={(e) => setAuth(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 bg-white">
                <option value="">Authentication</option><option>JWT</option><option>Firebase</option>
              </select>
              <select aria-label="Model" value={model} onChange={(e) => setModel(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 bg-white">
                <option value="">AI model preference</option><option>OpenAI</option><option>Gemini</option><option>Claude</option>
              </select>
              <select aria-label="Database" value={database} onChange={(e) => setDatabase(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 bg-white">
                <option value="">Database preference</option><option>MongoDB</option><option>PostgreSQL</option>
              </select>
              <select aria-label="Output language" value={outputLanguage} onChange={(e) => setOutputLanguage(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 bg-white">
                <option value="en">Prompt language: English</option><option value="ta">Prompt language: Tamil</option>
              </select>
            </div>
          </section>
        )}

        {mode === "ai" && (
          <label htmlFor="output-language" className="flex flex-wrap items-center gap-2 mb-4 text-sm text-gray-600">
            Prompt language
            <select id="output-language" value={outputLanguage} onChange={(e) => setOutputLanguage(e.target.value)} className="p-2 rounded-lg border border-gray-300 bg-white">
              <option value="en">English</option><option value="ta">Tamil</option>
            </select>
          </label>
        )}

        <button onClick={handleSubmit} disabled={isGenerating} aria-busy={isGenerating}
          className="w-full mt-2 bg-orange-500 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-80 text-white p-3 rounded-xl font-semibold shadow-lg shadow-orange-500/30 transition-opacity">
          {isGenerating ? <span className="inline-flex items-center justify-center gap-2" role="status" aria-live="polite"><span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />Generating your prompt...</span> : "Generate prompt"}
        </button>

        {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
        {result && (
          <section className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between gap-3 mb-3"><h2 className="font-bold text-gray-800">Your generated prompt</h2><button onClick={() => navigator.clipboard?.writeText(result)} className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-100">Copy</button></div>
            <pre className="text-sm whitespace-pre-wrap text-gray-800 max-h-[32rem] overflow-auto">{result}</pre>
          </section>
        )}
        <p className="mt-6 text-center text-xs text-gray-400">Keep your API keys on the backend. Never place secrets in frontend environment variables.</p>
      </main>
    </div>
  );
}

export default App;
