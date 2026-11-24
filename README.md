# Promptronix — Intelligent Prompt Architect

Promptronix turns a rough idea into a context-aware, platform-specific prompt. It identifies the creator's role, intended audience, purpose, target AI application and expected outcome, then generates relevant follow-up questions as dropdowns before constructing and checking the final prompt.

## Product flow

1. **Describe the idea** in English, Tamil script or Tanglish. Voice input is also supported in compatible browsers.
2. **Select context** using dropdowns: creator role, target audience, purpose, target application, skill level, solution complexity and expected deliverable.
3. **Discover missing requirements** — the backend uses Gemini to generate 2–5 relevant dropdown questions based on the idea and selections. If discovery is unavailable, the frontend uses platform- and purpose-aware fallback dropdowns.
4. **Generate the prompt** — the backend combines the original idea, selected context, adaptive answers and optional technical preferences into a 17-section prompt tailored to the selected application.
5. **Evaluate and copy** — the backend checks required prompt sections locally and returns any relevant NVIDIA skill references.

## Supported target applications

The target application selector contains only these 12 entries:

1. Google AI Studio
2. v0 by Vercel
3. Claude
4. Lovable
5. Bolt.new
6. Replit
7. Firebase Studio
8. Base44
9. Emergent
10. Create.xyz
11. Tempo Labs
12. GitHub Spark

Each platform has dedicated prompt-construction guidance. The prompt engine differentiates, for example, UI-first v0 requests from Replit's runnable project workflow and Firebase Studio's service/security configuration.

## NVIDIA Agent Skills integration

Promptronix uses the official [NVIDIA/skills repository](https://github.com/NVIDIA/skills) as a selective reference source.

- The backend detects clear NVIDIA-domain signals such as RAG, CUDA-Q, cuDF/RAPIDS, DeepStream, GPU acceleration and NVIDIA tools.
- When relevant, it retrieves the matching official SKILL.md from NVIDIA's repository and supplies it as bounded reference material to the prompt engine.
- When no NVIDIA-domain match exists, it does not force NVIDIA technology into the prompt.
- NVIDIA Agent Skills are specialized product/workflow instructions, not a general-purpose prompt-engineering methodology. Promptronix's own prompt-engineering framework handles role, context, objective, constraints, task decomposition, output format, security and self-review for all requests.

The NVIDIA skill lookup is non-blocking: if the repository cannot be reached, prompt generation continues using the built-in framework.

## Requirements

Use Node.js 22 or later and npm.

## Run locally

Use two terminals from the repository root.

**Terminal 1 — backend**

Run: cd backend
Copy .env.example to .env, add GEMINI_API_KEY, then run npm install, npm test and npm run dev.

The API runs at http://localhost:5000.

**Terminal 2 — frontend**

Run: cd frontend/frontend
Then run npm install and npm run dev.

Vite usually serves the frontend at http://localhost:5173. The local frontend defaults to http://localhost:5000. For a remote backend, set VITE_API_URL in frontend/frontend/.env.

## Environment variables

Backend backend/.env:

- GEMINI_API_KEY — required; keep it on the server only.
- GEMINI_MODEL — optional; defaults to gemini-3.8-flash.
- PORT — optional; defaults to 5000.
- CLIENT_ORIGIN — comma-separated allowed frontend origins. Include the exact Vercel domain used by the frontend.
- TRUST_PROXY — set to 1 only when behind one trusted reverse proxy.

Frontend frontend/frontend/.env:

- VITE_API_URL — base URL of the deployed backend. This is a public URL, not a secret.

Never add provider secrets to VITE_* variables or commit real .env files.

## Deploy

The frontend and backend are separate deployments.

**Frontend (Vercel):**
- Root Directory: frontend/frontend
- Build command: npm run build
- Output directory: dist
- Environment variable: VITE_API_URL=https://<your-backend-host>

**Backend (Render, Railway or another Node host):**
- Root Directory: backend
- Build command: npm install
- Start command: npm start
- Configure GEMINI_API_KEY, GEMINI_MODEL, CLIENT_ORIGIN and PORT as required.

After updating backend files, redeploy the backend service as well as the Vercel frontend. Vercel deployment of the static frontend does not automatically deploy the separate Express API.

## API

- GET / — API status.
- GET /api/health — provider/model/configuration status. Does not reveal the API key.
- POST /api/discover — create adaptive dropdown questions from an idea and selected context.
- POST /api/generate — generate and validate the final prompt.
- POST /generate — backward-compatible alias for prompt generation.

The generation request can include userRole, targetAudience, purpose, tools, skillLevel, complexity, expectedOutput, dynamicAnswers, dynamicQuestions, stack, database, auth, deployment, model and outputLanguage.

## Quality and operational notes

- The final prompt includes 17 required sections; local validation checks whether they are present.
- Adaptive discovery and final generation are two Gemini calls when the user uses the full discovery flow.
- API requests have a basic in-memory rate limit. For a multi-instance production backend, use a shared store such as Redis.
- NVIDIA skill content is fetched only for relevant domains and cached in memory for 15 minutes. If the NVIDIA repository is unavailable, generation continues without that optional guidance.
