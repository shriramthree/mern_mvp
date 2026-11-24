import { useRef, useState } from "react";
import axios from "axios";

const LOCAL_HOST = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API_URL = (import.meta.env.VITE_API_URL || (LOCAL_HOST ? "http://localhost:5000" : "")).replace(/\/+$/, "");
const SELECT = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const PLATFORM_OPTIONS = ["Google AI Studio", "v0 by Vercel", "Claude", "Lovable", "Bolt.new", "Replit", "Firebase Studio", "Base44", "Emergent", "Create.xyz", "Tempo Labs", "GitHub Spark"];
const ROLE_OPTIONS = ["Student", "Software Developer", "Founder / Entrepreneur", "Business Owner", "UI/UX Designer", "Digital Marketer", "Content Creator", "Researcher", "Educator", "Other professional"];
const PURPOSE_OPTIONS = ["Build a web application", "Build a mobile application", "Create a website or landing page", "Design a UI/UX prototype", "Build an AI-powered product", "Automate a workflow", "Create content or a marketing campaign", "Research or analyze information", "Learn a subject or solve an academic problem", "Plan a business or product", "Other / let AI infer"];
const AUDIENCE_OPTIONS = ["General public", "Customers / consumers", "Students", "Teachers / educators", "Developers / technical teams", "Small businesses", "Enterprise teams", "Internal organization users", "Farmers / local communities", "Not sure — let AI decide"];
const SKILL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Expert", "Not sure — adapt to me"];
const COMPLEXITY_OPTIONS = ["Simple and focused", "Balanced", "Advanced and feature-rich", "Production-ready / enterprise"];
const OUTPUT_OPTIONS = ["Complete working application", "UI/UX design and frontend", "Architecture and implementation plan", "Code generation with file-by-file steps", "Research report or structured explanation", "Content, copywriting or campaign assets", "Workflow automation", "Other / let AI decide"];
const PLATFORM_QUESTIONS = {
  "Google AI Studio": [
    { id: "studioMode", label: "What should Google AI Studio help create?", options: ["Full-stack app prototype", "AI-powered web app", "Chatbot or AI assistant", "API / model experiment", "UI prototype", "Let AI decide"] },
    { id: "studioBackend", label: "Which backend direction do you prefer?", options: ["Firebase", "Supabase", "Node.js / Express", "Python / FastAPI", "No backend needed", "Let AI decide"] },
  ],
  "v0 by Vercel": [
    { id: "v0Focus", label: "What should v0 prioritize?", options: ["Complete responsive UI", "Dashboard / admin panel", "Landing page", "Multi-page SaaS interface", "Frontend with backend integration", "Let AI decide"] },
    { id: "v0Stack", label: "Preferred frontend stack?", options: ["Next.js + TypeScript", "React + TypeScript", "Next.js + Tailwind CSS", "AI choose the best stack"] },
  ],
  Claude: [
    { id: "claudeMode", label: "How will you use Claude?", options: ["Plan and architect a project", "Generate or refactor code", "Analyze documents / data", "Create content or research", "Build an artifact / prototype", "Let AI decide"] },
    { id: "claudeDepth", label: "How detailed should Claude's response be?", options: ["Concise action plan", "Step-by-step explanation", "Detailed implementation", "Thorough expert-level analysis"] },
  ],
  Lovable: [
    { id: "lovableBackend", label: "Which backend should the app use?", options: ["Supabase", "Firebase", "External REST API", "No backend for now", "Let Lovable recommend"] },
    { id: "lovableAuth", label: "Does the product need user accounts?", options: ["Email and password", "Google / social sign-in", "Role-based access", "No authentication", "Let AI decide"] },
  ],
  "Bolt.new": [
    { id: "boltScope", label: "What should Bolt build first?", options: ["Complete MVP", "Frontend prototype", "Full-stack application", "Landing page", "Internal tool / dashboard", "Let AI decide"] },
    { id: "boltData", label: "How should application data be stored?", options: ["Supabase", "Firebase", "PostgreSQL", "Local storage only", "No database", "Let AI decide"] },
  ],
  Replit: [
    { id: "replitBuild", label: "What should Replit Agent deliver?", options: ["Working full-stack application", "API / backend service", "Frontend prototype", "Automation or bot", "Data / AI project", "Let AI decide"] },
    { id: "replitDeploy", label: "Should deployment be included?", options: ["Yes, deploy-ready setup", "Yes, with deployment guide", "Local development only", "Let AI decide"] },
  ],
  "Firebase Studio": [
    { id: "firebaseServices", label: "Which Firebase capabilities are needed?", options: ["Authentication + Firestore", "Database + Storage", "Hosting + Authentication", "Complete Firebase integration", "No Firebase services yet", "Let AI decide"] },
    { id: "firebaseApp", label: "What kind of app should it scaffold?", options: ["Web application", "Mobile-friendly web app", "AI application", "Admin dashboard", "Let AI decide"] },
  ],
  Base44: [
    { id: "base44App", label: "What type of product are you creating?", options: ["Business management app", "Customer-facing portal", "Marketplace / booking app", "Internal workflow tool", "Community / content app", "Let AI decide"] },
    { id: "base44Data", label: "What data capability is most important?", options: ["User profiles and roles", "Records and dashboards", "Payments and orders", "Forms and approvals", "Let AI decide"] },
  ],
  Emergent: [
    { id: "emergentScope", label: "How much should Emergent build autonomously?", options: ["Plan first, then build", "Build the complete MVP", "Build and test end-to-end", "Improve an existing application", "Let AI decide"] },
    { id: "emergentPriority", label: "What is the most important outcome?", options: ["Fast functional prototype", "Production-minded application", "Polished user experience", "Reliable backend and integrations", "Let AI decide"] },
  ],
  "Create.xyz": [
    { id: "createType", label: "What should Create.xyz generate?", options: ["Business web app", "AI-powered tool", "Landing page", "Interactive directory / portal", "Internal productivity tool", "Let AI decide"] },
    { id: "createIntegration", label: "Which integrations are important?", options: ["Database", "Authentication", "Payments", "External APIs", "None yet", "Let AI decide"] },
  ],
  "Tempo Labs": [
    { id: "tempoInput", label: "What are you starting from?", options: ["A written product idea", "Existing React codebase", "Figma design", "Screenshot / visual reference", "A partially built application", "Let AI decide"] },
    { id: "tempoFocus", label: "What should Tempo prioritize?", options: ["Accurate design-to-code", "Responsive UI implementation", "Component architecture", "Refactor and improve existing UI", "Let AI decide"] },
  ],
  "GitHub Spark": [
    { id: "sparkType", label: "What should GitHub Spark help you create?", options: ["Small interactive web app", "Personal productivity tool", "Data-driven application", "AI-enhanced experience", "Prototype for an idea", "Let AI decide"] },
    { id: "sparkData", label: "What should happen to user data?", options: ["Persist user data", "Use sample data only", "Connect an external API", "No data storage needed", "Let AI decide"] },
  ],
};
const PURPOSE_QUESTIONS = {
  "Build a web application": [
    { id: "webKind", label: "What kind of web application is it?", options: ["SaaS platform", "E-commerce / marketplace", "Dashboard / admin system", "Booking / appointment system", "Education / learning platform", "Community / social platform", "Other / let AI decide"] },
    { id: "webScale", label: "What is the expected project scale?", options: ["Single-page prototype", "Small MVP", "Multi-page application", "Scalable production product"] },
  ],
  "Build a mobile application": [
    { id: "mobileTarget", label: "Which devices should the app support?", options: ["Android", "iOS", "Android and iOS", "Mobile-responsive web app", "Let AI decide"] },
    { id: "mobileType", label: "What type of mobile experience do you need?", options: ["Native-style app", "Cross-platform app", "Progressive web app", "Mobile app prototype", "Let AI decide"] },
  ],
  "Design a UI/UX prototype": [
    { id: "designDeliverable", label: "What design output do you need?", options: ["Interactive prototype", "High-fidelity screens", "Design system and components", "User flow and wireframes", "Design-to-code implementation"] },
    { id: "designStyle", label: "Which visual direction fits best?", options: ["Minimal and clean", "Modern SaaS", "Bold and expressive", "Corporate and professional", "Friendly and playful", "Let AI decide"] },
  ],
  "Automate a workflow": [
    { id: "automationTrigger", label: "What starts the workflow?", options: ["Schedule / timer", "User action / form submission", "Webhook / API event", "Incoming email / message", "File or data update", "Let AI decide"] },
    { id: "automationOutput", label: "What should the workflow produce?", options: ["Notification or message", "Updated records / database", "Generated report", "AI decision or content", "Multiple connected actions", "Let AI decide"] },
  ],
  "Create content or a marketing campaign": [
    { id: "contentChannel", label: "Where will the content be published?", options: ["Instagram", "YouTube", "LinkedIn", "Website / blog", "Email campaign", "Multiple channels", "Let AI decide"] },
    { id: "contentFormat", label: "What content format do you need?", options: ["Short-form copy / captions", "Video script", "Long-form article", "Ad campaign", "Content calendar", "Let AI decide"] },
  ],
  "Research or analyze information": [
    { id: "researchMethod", label: "What kind of analysis is required?", options: ["Compare options", "Summarize sources / documents", "Evidence-based research", "Analyze data", "Find trends and insights", "Let AI decide"] },
    { id: "researchOutput", label: "What should the final output look like?", options: ["Executive summary", "Detailed report with sources", "Comparison table", "Presentation outline", "Actionable recommendations"] },
  ],
};

function SelectField({ label, value, onChange, options, placeholder = "Select an option", hint, required = false }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-700">{label}{required ? " *" : ""}</label>
      <select className={SELECT} value={value || ""} onChange={(event) => onChange(event.target.value)} required={required}>
        <option value="">{placeholder}</option>
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
      {hint && <p className="text-xs leading-5 text-slate-500">{hint}</p>}
    </div>
  );
}

function App() {
  const [prompt, setPrompt] = useState("");
  const [tools, setTools] = useState("");
  const [userRole, setUserRole] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [purpose, setPurpose] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [complexity, setComplexity] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [outputLanguage, setOutputLanguage] = useState("en");
  const [mode, setMode] = useState("ai");
  const [stack, setStack] = useState("");
  const [deployment, setDeployment] = useState("");
  const [auth, setAuth] = useState("");
  const [model, setModel] = useState("");
  const [database, setDatabase] = useState("");
  const [dynamicQuestions, setDynamicQuestions] = useState([]);
  const [dynamicAnswers, setDynamicAnswers] = useState({});
  const [discoverySummary, setDiscoverySummary] = useState("");
  const [discoverySource, setDiscoverySource] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [result, setResult] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [validation, setValidation] = useState(null);
  const [skillInfo, setSkillInfo] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const [voiceError, setVoiceError] = useState("");
  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const lastTranscriptRef = useRef("");

  const localQuestions = () => {
    const platform = PLATFORM_QUESTIONS[tools] || [];
    const purposeItems = PURPOSE_QUESTIONS[purpose] || [];
    const common = [{ id: "mustHave", label: "What should be prioritized?", options: ["Ease of use and accessibility", "Performance and reliability", "Visual quality and user experience", "Security and privacy", "Fast delivery of an MVP", "Balanced across all areas"] }];
    return [...platform, ...purposeItems, ...common].slice(0, 5).map((question) => ({ ...question, required: false, helperText: "Choose the closest option. You can leave this blank and let AI decide." }));
  };

  const handleDiscover = async () => {
    if (prompt.trim().length < 3) {
      setError("Describe your idea first so Promptronix can identify the right questions.");
      return;
    }
    setError("");
    setIsDiscovering(true);
    setDynamicAnswers({});
    try {
      const response = await axios.post(API_URL + "/api/discover", { prompt, tools, userRole, targetAudience, purpose, skillLevel, outputLanguage }, { timeout: 35000 });
      const questions = Array.isArray(response.data.questions) ? response.data.questions : [];
      if (questions.length) {
        setDynamicQuestions(questions.slice(0, 5));
        setDiscoverySummary(response.data.summary || "Promptronix identified the details that will make your prompt more specific.");
        setDiscoverySource("AI-generated questions");
      } else {
        setDynamicQuestions(localQuestions());
        setDiscoverySummary("Using platform- and purpose-aware questions.");
        setDiscoverySource("Adaptive fallback questions");
      }
    } catch {
      setDynamicQuestions(localQuestions());
      setDiscoverySummary("The AI discovery service was unavailable, so Promptronix selected relevant questions from your platform and purpose.");
      setDiscoverySource("Adaptive fallback questions");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSubmit = async () => {
    if (isGenerating) return;
    if (prompt.trim().length < 3) {
      setError("Please describe your idea first.");
      return;
    }
    const unanswered = dynamicQuestions.find((question) => question.required && !dynamicAnswers[question.id]);
    if (unanswered) {
      setError("Please answer: " + unanswered.label);
      return;
    }
    setError("");
    setCopied(false);
    setIsGenerating(true);
    try {
      const response = await axios.post(API_URL + "/api/generate", {
        prompt, tools, mode, stack, deployment, auth, model, database, skillLevel, purpose, outputLanguage,
        userRole, targetAudience, complexity, expectedOutput, dynamicAnswers,
        dynamicQuestions: dynamicQuestions.map(({ id, label }) => ({ id, label })),
      }, { timeout: 70000 });
      const data = response.data;
      if (typeof data.result !== "string" || !data.result.trim()) throw new Error("The server returned an empty prompt. Please try again.");
      setResult(data.result);
      setAnalysis(data.analysis || null);
      setValidation(data.validation || null);
      setSkillInfo(data.nvidiaSkills || null);
    } catch (err) {
      setResult("");
      setAnalysis(null);
      setValidation(null);
      setSkillInfo(null);
      setError(err.code === "ECONNABORTED" ? "Generation timed out. Try a shorter idea or try again." : (err.response?.data?.error || (!API_URL ? "The prompt backend is not connected to this Vercel deployment. Set VITE_API_URL to your deployed backend URL, then redeploy." : (err.message || "Could not reach the prompt service. Check the backend URL and server status."))));
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
        if (item.isFinal) {
          const transcript = item[0]?.transcript?.trim();
          const confidence = item[0]?.confidence;
          if (!transcript || (typeof confidence === "number" && confidence > 0 && confidence < 0.65)) continue;
          if (transcript === lastTranscriptRef.current) continue;
          lastTranscriptRef.current = transcript;
          finalChunks.push(transcript);
        }
      }
      if (finalChunks.length) setPrompt((current) => current ? current + " " + finalChunks.join(" ") : finalChunks.join(" "));
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
      } else setIsListening(false);
    };
    try {
      recognition.start();
    } catch {
      shouldKeepListeningRef.current = false;
      setIsListening(false);
      setVoiceError("Could not start voice typing. Please try again.");
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 text-slate-800 sm:py-12" style={{ backgroundColor: "#f8fafc", backgroundImage: "radial-gradient(900px 520px at 8% 0%, rgba(251, 146, 60, 0.20), transparent 65%), radial-gradient(760px 500px at 100% 8%, rgba(129, 140, 248, 0.16), transparent 62%), radial-gradient(700px 440px at 50% 100%, rgba(251, 191, 36, 0.10), transparent 66%), linear-gradient(135deg, #fffaf5 0%, #f8fafc 52%, #f1f5ff 100%)", backgroundAttachment: "fixed" }}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-orange-700 shadow-sm"><span className="h-2 w-2 rounded-full bg-orange-500" />INTELLIGENT PROMPT ARCHITECT</div>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">PROMPT<span className="text-orange-500">RONIX</span></h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Start with an idea. We identify your goal, the people you serve and the AI platform you use — then ask only the details that improve your prompt.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
          <section className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-xl shadow-slate-200/60 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Step 01 · Discovery</p><h2 className="mt-1 text-xl font-bold text-slate-900">Tell us what you want to create</h2></div>
              <span className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">Idea → Context → Prompt</span>
            </div>

            <label htmlFor="project-idea" className="mb-2 block text-sm font-semibold text-slate-700">Describe your idea in your own words</label>
            <textarea id="project-idea" rows={4} placeholder="Example: I want to build a platform where farmers can identify crop diseases, get treatment guidance and find local suppliers." value={prompt} onChange={(event) => { setPrompt(event.target.value); setDynamicQuestions([]); setDynamicAnswers({}); }} maxLength={4000} className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" onClick={handleVoiceInput} aria-pressed={isListening} className={"rounded-xl px-3 py-2 text-xs font-semibold transition " + (isListening ? "bg-red-100 text-red-700" : "bg-orange-50 text-orange-700 hover:bg-orange-100")}>{isListening ? "■ Stop listening" : "🎙 Voice type"}</button>
              <label htmlFor="speech-language" className="text-xs text-slate-500">Voice language</label>
              <select id="speech-language" value={speechLanguage} onChange={(event) => setSpeechLanguage(event.target.value)} disabled={isListening} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"><option value="en-IN">English (India)</option><option value="ta-IN">Tamil (India)</option></select>
              {isListening && <span className="text-xs font-medium text-red-600" role="status">Listening…</span>}
            </div>
            {voiceError && <p className="mt-2 text-xs text-red-600" role="alert">{voiceError}</p>}

            <div className="my-7 h-px bg-slate-100" />
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Step 02 · Understand your context</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Who are you?" value={userRole} onChange={setUserRole} options={ROLE_OPTIONS} placeholder="Select your role" />
              <SelectField label="Who is the final product for?" value={targetAudience} onChange={setTargetAudience} options={AUDIENCE_OPTIONS} placeholder="Choose the target audience" />
              <SelectField label="What are you trying to achieve?" value={purpose} onChange={(value) => { setPurpose(value); setDynamicQuestions([]); setDynamicAnswers({}); }} options={PURPOSE_OPTIONS} placeholder="Select your main purpose" />
              <SelectField label="Where will you use this prompt?" value={tools} onChange={(value) => { setTools(value); setDynamicQuestions([]); setDynamicAnswers({}); }} options={PLATFORM_OPTIONS} placeholder="Select one AI application" />
              <SelectField label="How familiar are you with this work?" value={skillLevel} onChange={setSkillLevel} options={SKILL_OPTIONS} placeholder="Select your experience level" />
              <SelectField label="What level of solution do you expect?" value={complexity} onChange={setComplexity} options={COMPLEXITY_OPTIONS} placeholder="Select the expected complexity" />
              <div className="sm:col-span-2"><SelectField label="What should the AI deliver?" value={expectedOutput} onChange={setExpectedOutput} options={OUTPUT_OPTIONS} placeholder="Select the expected output" /></div>
            </div>

            <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><h3 className="font-semibold text-slate-900">Let Promptronix identify missing details</h3><p className="mt-1 text-xs leading-5 text-slate-600">We use your idea, role, purpose and selected platform to create a short set of relevant dropdown questions.</p></div>
                <button type="button" onClick={handleDiscover} disabled={isDiscovering || !prompt.trim()} className="shrink-0 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{isDiscovering ? "Analysing…" : "Discover my requirements"}</button>
              </div>
            </div>

            {dynamicQuestions.length > 0 && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Step 03 · Adaptive questions</p><h3 className="mt-1 font-bold text-slate-900">A few details to sharpen your prompt</h3></div>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">{discoverySource}</span>
                </div>
                {discoverySummary && <p className="mb-4 text-xs leading-5 text-slate-600">{discoverySummary}</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                  {dynamicQuestions.map((question) => (
                    <SelectField key={question.id} label={question.label} value={dynamicAnswers[question.id] || ""} onChange={(value) => setDynamicAnswers((current) => ({ ...current, [question.id]: value }))} options={(question.options || []).map((option) => typeof option === "string" ? option : option.label || option.value).filter(Boolean)} placeholder={question.required ? "Choose an answer" : "Optional — let AI decide"} hint={question.helperText || "Choose the closest match. You can leave this blank if you are unsure."} required={Boolean(question.required)} />
                  ))}
                </div>
              </div>
            )}

            <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">Advanced technical preferences (optional)</summary>
              <p className="mb-4 mt-2 text-xs leading-5 text-slate-500">Leave these blank to let the selected AI platform recommend a suitable approach.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Technology stack" value={stack} onChange={setStack} options={["MERN", "MEAN", "Next.js + TypeScript", "React + Node.js", "Python + FastAPI", "Full Stack", "Let AI decide"]} />
                <SelectField label="Database" value={database} onChange={setDatabase} options={["PostgreSQL", "MongoDB", "Firebase / Firestore", "Supabase", "MySQL", "No database", "Let AI decide"]} />
                <SelectField label="Authentication" value={auth} onChange={setAuth} options={["Email and password", "JWT", "Firebase Authentication", "OAuth / social login", "Role-based authentication", "Not needed", "Let AI decide"]} />
                <SelectField label="Deployment preference" value={deployment} onChange={setDeployment} options={["Vercel", "Firebase Hosting", "Netlify", "AWS", "Render", "Local only", "Let AI decide"]} />
                <SelectField label="AI / model integration" value={model} onChange={setModel} options={["OpenAI", "Gemini", "Claude", "OpenRouter", "NVIDIA NIM", "Not needed", "Let AI decide"]} />
                <SelectField label="Prompt output language" value={outputLanguage} onChange={setOutputLanguage} options={[{ value: "en", label: "English" }, { value: "ta", label: "Tamil" }]} />
                <SelectField label="Decision preference" value={mode} onChange={setMode} options={[{ value: "ai", label: "AI decides the best options" }, { value: "customize", label: "Use my selected preferences" }]} />
              </div>
            </details>

            {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
            <button onClick={handleSubmit} disabled={isGenerating || !prompt.trim()} aria-busy={isGenerating} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
              {isGenerating ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Building your optimized prompt…</> : "Build my intelligent prompt"}
            </button>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-lg shadow-slate-200/50">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">How it works</p>
              <ol className="mt-4 space-y-4">
                {[["01", "Understand intent", "Identify your role, purpose and audience."], ["02", "Adapt questions", "Ask only the details relevant to your idea and platform."], ["03", "Engineer the prompt", "Structure context, constraints, tasks and deliverables."], ["04", "Evaluate quality", "Check completeness, clarity and platform fit."]].map(([number, title, detail]) => (
                  <li key={number} className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xs font-bold text-orange-700">{number}</span><div><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{detail}</p></div></li>
                ))}
              </ol>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-5">
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-lg">✳</span><h3 className="text-sm font-bold text-emerald-950">NVIDIA Skill Intelligence</h3></div>
              <p className="mt-3 text-xs leading-5 text-emerald-900/80">Promptronix checks NVIDIA Agent Skills for relevant NVIDIA technical domains such as CUDA, RAG, GPU computing and robotics. General prompt quality is handled by Promptronix’s own prompt-engineering framework.</p>
              <a className="mt-3 inline-flex text-xs font-semibold text-emerald-800 underline underline-offset-4" href="https://github.com/NVIDIA/skills" target="_blank" rel="noreferrer">Explore NVIDIA skills repository ↗</a>
            </div>
          </aside>
        </div>

        {(analysis || validation || skillInfo) && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Prompt intelligence report</h2>
            {analysis?.understood_summary && <p className="mt-2 text-sm leading-6 text-slate-600">{analysis.understood_summary}</p>}
            {validation && <p className="mt-3 text-xs font-semibold text-slate-600">{validation.ok ? "✓ Prompt structure check passed" : "Review recommended: " + (validation.missing || []).join(", ")}</p>}
            {skillInfo && <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-900"><b>NVIDIA skill check:</b> {skillInfo.message || "Completed."}{Array.isArray(skillInfo.skills) && skillInfo.skills.length > 0 && <span> Skills referenced: {skillInfo.skills.map((skill) => skill.name).join(", ")}.</span>}</div>}
          </section>
        )}

        {result && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-7">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Your optimized prompt</p><h2 className="mt-1 text-lg font-bold text-slate-900">Ready for {tools || "your selected AI platform"}</h2></div>
              <button type="button" onClick={handleCopy} className="rounded-xl bg-orange-100 px-4 py-2.5 text-sm font-bold text-orange-800 transition hover:bg-orange-200">{copied ? "✓ Copied" : "Copy prompt"}</button>
            </div>
            <pre className="max-h-[38rem] overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-800 sm:p-5 sm:text-sm">{result}</pre>
          </section>
        )}
        <footer className="mt-8 text-center text-xs text-slate-400">PROMPTRONIX · Context-aware prompts for real outcomes</footer>
      </div>
    </main>
  );
}

export default App;
