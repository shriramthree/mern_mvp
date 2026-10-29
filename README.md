# mern_mvp — AI Prompt Generator

Type a rough idea in **English, Tamil, or Tanglish** (typed or by voice). The backend uses the **Gemini API** to:

1. **Analyse** the idea → language, intent, users, explicit vs. implied features, constraints, edge cases, sensitive areas, assumptions, open questions.
2. **Compose** a complete 17-section prompt (role, context, objective, scope, functional / non-functional requirements, tech, architecture, UI/UX, workflow, output format, acceptance criteria, edge cases, security, assumptions, self-review) tuned for the chosen AI tool, skill level and purpose.
3. **Validate** that every section exists and repair the draft once if not.

## Run locally

```bash
# backend
cd backend
cp .env.example .env      # add GEMINI_API_KEY
npm install
npm run dev               # http://localhost:5000
npm test                  # offline tests (no API key needed)

# frontend
cd frontend/frontend
cp .env.example .env      # set VITE_API_URL if the backend is not on localhost:5000
npm install
npm run dev
```

## Deploy
The frontend is on Vercel; the Express backend must be hosted separately (Render, Railway, etc.). Set `GEMINI_API_KEY`, `GEMINI_MODEL` and `CLIENT_ORIGIN` on the backend host, and `VITE_API_URL` in Vercel.

## API
`POST /api/generate` — body: `{ prompt, tools, mode, stack, database, auth, deployment, model, skillLevel, purpose, outputLanguage }`
returns `{ result, analysis, validation, model }`.
