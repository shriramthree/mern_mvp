import { useState } from "react";

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

  // 🧠 SMART PROMPT GENERATOR (LONG OUTPUT)
  const generatePromptLocally = () => {
    if (!prompt) return "Please enter an idea...";

    let stackText = stack || "a modern full-stack solution";
    let toolText = tools || "industry-standard development tools";

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
🚀 DETAILED PROJECT PROMPT

Build a complete and scalable application based on the idea: "${prompt}".

This project should go beyond a basic implementation and evolve into a production-ready system with modern design principles and strong architecture.

The application must include a clean, intuitive, and user-friendly interface that works seamlessly across mobile and desktop devices.

Use ${stackText} as the primary technology stack to ensure performance, scalability, and maintainability.

Incorporate ${toolText} to streamline development, debugging, and deployment processes.

Implement a secure authentication system (${auth || "if required"}) to manage users and protect data effectively.

Design an efficient database structure (${database || "best suitable database"}) to handle large-scale data operations smoothly.

Follow a modular and well-organized folder structure separating frontend, backend, and services for better scalability and maintainability.

Ensure proper error handling, validation, and optimized performance across all components of the application.

Deploy the application using ${deployment || "a reliable cloud platform like Vercel, AWS, or Render"}.

${model ? `Integrate AI capabilities using ${model} where necessary to enhance user experience.` : "AI integration can be added if the project requires intelligent features."}

The final product should feel like a real-world application, polished, scalable, and ready for real users.
`;
  };

  // 🚀 HANDLE SUBMIT
  const handleSubmit = () => {
    const output = generatePromptLocally();
    setResult(output);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f4ef] via-[#f5efe8] to-[#efe7dc] flex justify-center items-start pt-16 px-4 text-gray-800">

      <div className="w-full max-w-2xl bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-md border border-gray-200">

        {/* TITLE */}
        <h1 className="text-4xl font-bold mb-6 text-center text-orange-500">
          Prompt Generator
        </h1>

        {/* PROMPT */}
        <input
          type="text"
          placeholder="Describe your idea..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-3 mb-4 rounded-xl border border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />

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
          className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-xl font-semibold shadow-lg shadow-orange-500/30"
        >
          Generate
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