# Knowledge Hub

REST API for Knowledge Hub platform built with Nest.js.

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js 24.10.0+ - [Download & Install Node.js](https://nodejs.org/en/download/) and npm.
- Docker - [Download & Install Docker](https://docs.docker.com/engine/install/).

## Downloading

```
git clone {repository URL}
cd nodejs-2026q1-knowledge-hub
```

## Installing NPM modules

```
npm install
```

## Environment

Create local `.env` from `.env.example`:

```powershell
Copy-Item .env.example .env
```

Required default value for assignment:

- `PORT=4000`

## Running application

```
npm start
```

After starting the app, open Swagger UI at:

- `http://localhost:4000/doc`

Notes:

- `/doc` is the current runtime OpenAPI documentation generated from Nest decorators.
- `doc/api.yaml` is a static file and may not always match runtime behavior.

## AI Features (Google Gemini API)

This API includes AI-powered endpoints for articles powered by [Google Gemini](https://ai.google.dev/).

### Step 1 — Obtain a Gemini API key

1. Open [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with a Google account.
3. Click **Create API key** → **Create API key in new project**.
4. Copy the generated key (starts with `AI...`).

> Free tier limits (as of 2025): 10 RPM, 1 000 000 TPM, 500 RPD for `gemini-2.5-flash`.  
> **Note:** `gemini-2.0-flash` free tier quota may be set to `0` in some regions/projects even with a valid key — use `gemini-2.5-flash` instead.  
> Regional availability: if you get persistent 429 errors, enable the **Generative Language API** in [Google Cloud Console](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com).

### Step 2 — Configure environment

Open `.env` and set the Gemini variables:

```dotenv
GEMINI_API_KEY=AIzaSy...your-key-here...
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-2.5-flash
AI_RATE_LIMIT_RPM=20
AI_CACHE_TTL_SEC=300
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | **yes** | — | API key from Google AI Studio |
| `GEMINI_API_BASE_URL` | no | `https://generativelanguage.googleapis.com` | Base URL for Gemini REST API |
| `GEMINI_MODEL` | no | `gemini-2.5-flash` | Model name |
| `AI_RATE_LIMIT_RPM` | no | `20` | Max AI requests per minute per IP |
| `AI_CACHE_TTL_SEC` | no | `300` | Cache TTL for summarize/translate responses |

### Step 3 — Run and test AI endpoints

Start the application (see **Running application** below), then use the Swagger UI at `http://localhost:4000/doc` (section **ai**) or curl:

**Summarize an article:**

```bash
curl -X POST http://localhost:4000/ai/articles/{articleId}/summarize \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"maxLength": "short"}'
```

**Translate an article:**

```bash
curl -X POST http://localhost:4000/ai/articles/{articleId}/translate \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"targetLanguage": "Spanish"}'
```

**Analyze an article:**

```bash
curl -X POST http://localhost:4000/ai/articles/{articleId}/analyze \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"task": "review"}'
```

**Free-form generation with conversation context:**

```bash
# First message — returns sessionId
curl -X POST http://localhost:4000/ai/generate \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is recursion?"}'

# Follow-up — pass sessionId to continue the conversation
curl -X POST http://localhost:4000/ai/generate \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Give me a code example", "sessionId": "{sessionId}"}'
```

**Usage statistics:**

```bash
curl http://localhost:4000/ai/usage \
  -H "Authorization: Bearer {accessToken}"
```

### Known limitations

- **Free-tier quota:** `gemini-2.5-flash` allows 15 RPM / 1 500 RPD on the free plan. The service applies its own `AI_RATE_LIMIT_RPM` guard, but the underlying Gemini quota may still be hit under load — the service retries up to 3 times with exponential backoff before returning `503`.
- **Latency:** Cold responses from Gemini typically take 2–8 seconds. Cached responses (summarize / translate) are served instantly.
- **Regional availability:** Gemini API may be blocked in some countries. If you receive `403` from the Gemini endpoint, check that your Google Cloud project is in an [approved region](https://ai.google.dev/gemini-api/docs/available-regions).
- **JSON output:** The analyze and translate endpoints ask Gemini to return JSON. Occasionally the model wraps the output in markdown fences; the service strips them automatically. If the JSON is still unparseable, the raw text is used as a safe fallback.
- **No persistent storage:** Usage counters, cache, and conversation sessions are in-memory and reset on server restart.

---

## Docker (Foundation for Prisma/PostgreSQL)

This repository includes Docker runtime infrastructure for the current in-memory API and for the upcoming Prisma migration step.

### Run with Docker Compose

```powershell
Copy-Item .env.example .env
docker-compose up --build
```

After startup:

- API: `http://localhost:4000/user`
- Swagger: `http://localhost:4000/doc`
- PostgreSQL: `localhost:5432`

Check service health:

```powershell
docker-compose ps
docker-compose logs app
docker-compose logs db
```

### Optional Adminer (debug profile)

```powershell
docker-compose --profile debug up --build
```

Adminer UI: `http://localhost:8080`

### Docker Hub image

- `https://hub.docker.com/r/urazof/knowledge-hub`

## Testing

Run tests in a separate terminal while app is running.

### Assignment-related tests

These suites validate functionality described in `assignment.md` (Users/Articles/Categories/Comments CRUD, validation, filters, cascades):

```bash
npm test
```

Run one specific suite:

```bash
npm run test -- <path to suite>
```

### Additional template test suites

These are template extensions for auth/RBAC/refresh scenarios:

```bash
npm run test:auth
```

```bash
npm run test:refresh
```

```bash
npm run test:rbac
```

Run one auth suite:

```bash
npm run test:auth -- <path to suite>
```

### Lint and format

```bash
npm run lint
```

```bash
npm run format
```

### Debugging in VSCode

Press <kbd>F5</kbd> to debug.

For more information, visit: https://code.visualstudio.com/docs/editor/debugging
