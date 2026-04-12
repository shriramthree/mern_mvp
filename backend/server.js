
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express(); // 
app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.post("/generate", async (req, res) => {
  try {
    const {
      prompt,
      mode,
      ui,
      tools,
      deployment,
      auth,
      model,
      database,
      stack
    } = req.body;

    function resolveOption(option, defaultValue) {
      if (!option) return defaultValue;
      if (option === "no_idea") return "AI_DECIDE";
      if (option === "not_needed") return "SKIP";
      return option;
    }

    // ✅ FIXED (tools is now string, not array)
    const finalTools = tools || "AI_DECIDE";

    const finalTheme = resolveOption(ui?.theme, "modern");
    const finalColor = resolveOption(ui?.color, "blue");
    const finalDeployment = resolveOption(deployment, "AI_DECIDE");
    const finalAuth = resolveOption(auth, "AI_DECIDE");
    const finalModel = resolveOption(model, "AI_DECIDE");
    const finalDatabase = resolveOption(database, "AI_DECIDE");
    const finalStack = stack || "AI_DECIDE";
    const systemPrompt = `
You are an expert at programming and architect.

Rules:
- AI_DECIDE → choose best option
- SKIP → remove feature

Return:
- Tech stack
- UI/UX
- Tools
- Features
- Folder structure
`;

    const userPrompt = `
Idea: ${prompt}

Mode: ${mode}

Theme: ${finalTheme}
Color: ${finalColor}

Tools: ${finalTools}
Deployment: ${finalDeployment}
Auth: ${finalAuth}
Model: ${finalModel}
Database: ${finalDatabase}
Stack: ${finalStack}
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    res.json({ result: response.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});
app.listen(5000, () => {
  console.log("🔥 Server running on port 5000");
});