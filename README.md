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

## RAG Features (Retrieval-Augmented Generation)

The RAG layer lets you **index Knowledge Hub articles into a vector database** and then query them with natural-language questions answered by Gemini — grounded in actual article content.

Architecture: Qdrant (external vector DB) + Gemini embeddings (`gemini-embedding-001`) + Gemini generation (`gemini-2.5-flash`).

### Step 1 — Gemini API key

Follow **Step 1** from the [AI Features](#ai-features-google-gemini-api) section above. The same key is used for both generation and embeddings. Make sure `GEMINI_API_KEY` is set in your `.env`.

### Step 2 — Configure RAG environment

Open `.env` and verify the RAG variables (all have sensible defaults):

```dotenv
# Gemini embeddings model
GEMINI_EMBEDDING_MODEL=gemini-embedding-001

# Qdrant URL — use http://vectordb:6333 when running in Docker Compose
RAG_VECTOR_DB_URL=http://vectordb:6333

# Collection name inside Qdrant
RAG_VECTOR_COLLECTION=knowledge_hub_articles

# Host port for Qdrant (change if 6333 is taken on your machine)
QDRANT_EXTERNAL_PORT=6333

# Chunk size and overlap (characters)
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=200

# Max messages stored per conversation (0 = unlimited)
RAG_CONVERSATION_MAX_MESSAGES=20
```

> If you run the app locally (not in Docker), set `RAG_VECTOR_DB_URL=http://localhost:6333`.

### Step 3 — Start the vector database

Qdrant runs as a separate Docker service. Start it alongside the app:

```bash
docker compose up -d
```

Verify Qdrant is healthy:

```bash
curl http://localhost:6333/healthz
# Expected: {"title":"qdrant - healthy"}
```

Or check with Docker:

```bash
docker compose ps
# vectordb should show: healthy
```

### Step 4 — Build the vector index

Once the app and Qdrant are running, trigger indexing. This chunks all published articles, embeds each chunk via Gemini, and stores vectors in Qdrant.

```bash
# Index all published articles
curl -X POST http://localhost:4000/ai/rag/index \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"onlyPublished": true}'
```

Expected response:
```json
{
  "indexedArticles": 5,
  "skippedArticles": 0,
  "indexedChunks": 23,
  "vectorCollection": "knowledge_hub_articles"
}
```

**Incremental re-index:** Run the same command again after updating articles. Unchanged articles are skipped automatically (`skippedArticles > 0`). Only modified articles are re-embedded.

**Index specific articles:**
```bash
curl -X POST http://localhost:4000/ai/rag/index \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"articleIds": ["uuid-1", "uuid-2"]}'
```

**Remove an article from the index:**
```bash
curl -X DELETE http://localhost:4000/ai/rag/index/articles/{articleId} \
  -H "Authorization: Bearer {accessToken}"
# 204 No Content on success, 404 if article was not indexed
```

### Step 5 — Use RAG endpoints

**Semantic search** — find relevant chunks across all indexed articles:

```bash
curl -X POST http://localhost:4000/ai/rag/search \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"query": "how to handle errors in NestJS", "limit": 5}'
```

Search with metadata filters:
```bash
curl -X POST http://localhost:4000/ai/rag/search \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "authentication best practices",
    "limit": 3,
    "articleStatus": "PUBLISHED",
    "tags": ["security", "jwt"]
  }'
```

**RAG Chat** — ask a question, get an answer grounded in article content:

```bash
# First question — no conversationId needed
curl -X POST http://localhost:4000/ai/rag/chat \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{"question": "What articles do you have about NestJS?"}'
```

Response includes a `conversationId` — pass it back to continue the conversation:
```bash
# Follow-up question — uses conversation history
curl -X POST http://localhost:4000/ai/rag/chat \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Which of those articles covers dependency injection?",
    "conversationId": "{conversationId from previous response}"
  }'
```

**Retrieve conversation history:**
```bash
curl http://localhost:4000/ai/rag/chat/{conversationId}/history \
  -H "Authorization: Bearer {accessToken}"
```

All RAG endpoints are also available in Swagger UI at `http://localhost:4000/doc` under the **rag** tag.

### RAG Known Limitations

- **Embedding rate limit:** `gemini-embedding-001` on the free tier is rate-limited. Indexing many articles in sequence may trigger `503` (retried automatically). If indexing fails, wait 60 seconds and re-run — incremental mode will skip already-indexed articles.
- **Index is not persistent across Qdrant restarts without a volume:** The Docker Compose setup uses a named volume (`qdrant_data`) so data survives container restarts. If you delete the volume (`docker compose down -v`), re-run `POST /ai/rag/index`.
- **Conversation memory is in-memory:** `conversationId` history is lost on app restart. Start a new conversation after restarting the server.
- **Retrieval quality depends on index freshness:** After editing an article, call `POST /ai/rag/index` (or `POST /ai/rag/index` with `articleIds`) to update its vectors. Stale vectors return outdated content.
- **Free-tier latency:** First requests to Gemini after a period of inactivity may take 5–15 seconds. Subsequent requests are faster.
- **Search returns empty if index is empty:** Run `POST /ai/rag/index` before querying. A `200` with `results: []` means no articles matched the score threshold (0.3 minimum cosine similarity).

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
