# Promptronix — AI Prompt Generator

Promptronix turns a rough project idea into a structured prompt for AI coding tools. The frontend sends the idea and your preferences to an Express backend; the backend uses the Gemini API to analyse the requirements, compose a detailed prompt, validate its required sections, and repair the prompt once if any section is missing.

## How it works

1. **Enter an idea** in English, Tamil script, or Tanglish, by typing or voice.
2. **Choose preferences** such as target tool, skill level, purpose, output language, and optional stack/database/authentication/deployment choices.
3. **Analyse** the idea into structured requirements, users, constraints, edge cases, assumptions, and open questions.
4. **Compose and validate** a 17-section prompt with the original idea preserved.
5. **Review and copy** the prompt from the results area.

## Requirements

Use Node.js 22 or later and npm.

## Run locally

Use two terminals from the repository root.

**Terminal 1 — backend**

```bash
cd backend
# Copy .env.example to .env, then add your Gemini API key.
npm install
npm test
npm run dev
```

The backend runs at `http://localhost:5000`. The `npm test` command tests the prompt-engine pipeline without calling Gemini or consuming API quota.

**Terminal 2 — frontend**

```bash
cd frontend/frontend
npm install
npm run dev
```

Vite prints the local frontend URL, usually `http://localhost:5173`. The frontend defaults to the local backend. To point it somewhere else, copy `frontend/frontend/.env.example` to `.env` and set `VITE_API_URL` to your backend's base URL.

## Environment variables

Backend `backend/.env`:

- `GEMINI_API_KEY` — required; obtain a key from Google AI Studio. Keep it on the server only.
- `GEMINI_MODEL` — optional; defaults to `gemini-3.8-flash`.
- `PORT` — optional; defaults to `5000`.
- `CLIENT_ORIGIN` — comma-separated allowed frontend origins. Set this to your actual production frontend URL when deployed.

Frontend `frontend/frontend/.env`:

- `VITE_API_URL` — backend base URL, e.g. `http://localhost:5000`. This must not contain an API secret.

Never commit real `.env` files or API keys.

## Deploy

- **Frontend (Vercel):** set the Root Directory to `frontend/frontend`, build command to `npm run build`, output directory to `dist`, and set `VITE_API_URL` to your deployed backend URL.
- **Backend (Render/Railway or similar):** set Root Directory to `backend`, build command to `npm install`, start command to `npm start`, and configure `GEMINI_API_KEY`, `GEMINI_MODEL`, and `CLIENT_ORIGIN`.

The frontend and backend are separate deployments. Deploying the frontend alone does not deploy the API.

## API

- `GET /` — API status.
- `GET /api/health` — provider/model/configuration status (does not reveal the API key).
- `POST /api/generate` — generate a prompt.
- `POST /generate` — backward-compatible alias.

Example request:

```json
{
  "prompt": "Build a student attendance management app",
  "tools": "Replit",
  "mode": "ai",
  "skillLevel": "Beginner",
  "purpose": "College project",
  "outputLanguage": "en"
}
```

The response contains `result`, `analysis`, `validation`, and `model`.

## Notes

- Request validation and a simple in-memory rate limit are included. For a multi-instance production deployment, replace the in-memory limiter with a shared store such as Redis.
- This repository change does not automatically create or change a Vercel/Render deployment. Configure the environment variables on the hosting providers before using the live app.
