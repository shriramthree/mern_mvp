# mern_mvp

Promptronix is an AI-powered prompt generator built with React + Vite and an Express backend. It converts plain-language ideas into structured, AI-ready prompts for coding tools.

## Project structure

- `frontend/frontend` — React + Vite client
- `backend` — Express API and prompt-engine pipeline

## Run locally

1. Configure the backend environment: copy `backend/.env.example` to `backend/.env` and add your Gemini API key.
2. Start the API: `cd backend && npm install && npm run dev`.
3. Configure the client: copy `frontend/frontend/.env.example` to `frontend/frontend/.env` if your API is hosted elsewhere.
4. Start the client: `cd frontend/frontend && npm install && npm run dev`.

Never commit `.env` files or API keys.