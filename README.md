# Spur – AI Live Chat Agent

A mini AI-powered customer support chat widget for **Nova Threads**, a fictional e-commerce fashion store. Built as a take-home assignment for Spur.

---

## Live Demo

- **App (frontend):** https://spur-ai-live-chat-agent-indol.vercel.app
- **Backend API:** https://spur-bnwf.onrender.com (health check: [`/health`](https://spur-bnwf.onrender.com/health))

> Note: the backend is on Render's free tier and may take ~30s to wake from cold start on the first request.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js · TypeScript · Express |
| Database | SQLite (via Drizzle ORM + better-sqlite3) |
| LLM | Google Gemini (gemini-2.5-flash-lite) |
| Frontend | Next.js 15 (App Router) · React · Tailwind CSS |
| Deployment | Frontend on Vercel · Backend on Render |

---

## Project Structure

```
spur/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts        # Drizzle table definitions
│   │   │   ├── client.ts        # SQLite connection + Drizzle client
│   │   │   └── migrate.ts       # Idempotent DDL migration script
│   │   ├── middleware/
│   │   │   └── errorHandler.ts  # 404 + global error middleware
│   │   ├── routes/
│   │   │   └── chat.ts          # POST /chat/message, GET /chat/history/:id
│   │   ├── services/
│   │   │   ├── llm.ts           # Gemini SDK wrapper + store knowledge base
│   │   │   └── conversation.ts  # DB access layer (sessions, messages)
│   │   └── index.ts             # Express app entry point
│   ├── .env.example
│   └── tsconfig.json
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    │   ├── ChatWidget.tsx        # Top-level chat panel (orchestrator)
    │   ├── ChatBubble.tsx        # Individual message bubble
    │   ├── ChatInput.tsx         # Textarea + send button
    │   └── TypingIndicator.tsx   # Animated "agent is typing…" dots
    ├── hooks/
    │   └── useChat.ts            # All chat state + session management
    ├── lib/
    │   └── api.ts                # Typed fetch wrappers for backend API
    └── .env.example
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone & install

```bash
git clone <repo-url>
cd spur
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY
npm install
npm run db:migrate   # Creates spur.db with tables
npm run dev          # Starts backend on http://localhost:3001
```

### 3. Set up the frontend

```bash
cd ../frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL defaults to http://localhost:3001 — change if needed
npm install
npm run dev          # Starts frontend on http://localhost:3000
```

### 4. Open the app

Visit [http://localhost:3000](http://localhost:3000) and start chatting.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_API_KEY` | ✅ | — | Your Google Gemini API key |
| `PORT` | ❌ | `3001` | Port for the Express server |
| `DATABASE_PATH` | ❌ | `./spur.db` | Path to the SQLite database file |
| `FRONTEND_URL` | ❌ | `http://localhost:3000` | Allowed CORS origin |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ❌ | `http://localhost:3001` | Backend base URL (set to the Render backend URL in production) |

---

## API Reference

### `POST /chat/message`

Send a user message and get an AI reply.

**Request body:**
```json
{
  "message": "What's your return policy?",
  "sessionId": "optional-uuid-to-resume-session"
}
```

**Response:**
```json
{
  "reply": "We accept returns within 30 days of delivery…",
  "sessionId": "uuid-v4"
}
```

**Error responses:** `400` (invalid input), `429` (rate limit), `502/503/504` (LLM errors), `500` (unexpected).

---

### `GET /chat/history/:sessionId`

Fetch the full message history for a session.

**Response:**
```json
{
  "sessionId": "uuid-v4",
  "messages": [
    { "id": "...", "conversationId": "...", "sender": "user", "text": "...", "createdAt": 1234567890 }
  ]
}
```

---

## Architecture Overview

### Backend layers

```
HTTP Request
    │
    ▼
Express Router (routes/chat.ts)
  - Input validation (express-validator)
  - Route handler logic
    │
    ├──► Conversation Service (services/conversation.ts)
    │      - getOrCreateConversation()   → SQLite via Drizzle ORM
    │      - saveMessage()
    │      - getConversationHistory()
    │
    └──► LLM Service (services/llm.ts)
           - generateReply(history, message)
           - Calls Google Gemini (gemini-2.5-flash-lite)
           - Wraps all API errors into typed LLMError
```

The DB layer (Drizzle ORM) is kept strictly separate from the LLM service — each can evolve independently. The route handler orchestrates them: persist user message → call LLM → persist AI reply → respond.

### Frontend state flow

```
useChat() hook
  - Reads sessionId from sessionStorage on mount
  - Fetches history if session exists
  - send(text): optimistic UI → API call → update messages
  - Persists sessionId to sessionStorage after first message

ChatWidget
  - Renders empty state with suggestion chips
  - Renders message list + TypingIndicator when loading
  - Auto-scrolls to bottom on new messages
```

---

## LLM Integration Notes

**Provider:** Google Gemini (gemini-2.5-flash-lite)  
**Why Gemini Flash Lite?** It's fast, cheap, and has a generous free tier — more than capable for FAQ-style support. For a production product you might move to a larger model for more nuanced reasoning.

**Prompting approach:**
- The full Nova Threads knowledge base (shipping, returns, payments, hours) is passed as the model's `systemInstruction`.
- Up to the last 20 messages of conversation history are replayed into `startChat({ history })` for context.
- Max output tokens capped at 512 — enough for a complete support reply, limits runaway cost.
- Safety settings block harassment / hate-speech content.
- LLM is instructed to stay in-scope and direct unknowns to `support@novathreads.com`.

**Error handling:**
| Error | HTTP status | User message |
|---|---|---|
| Rate limited | 429 | "Rate limit reached. Please try again in a moment." |
| Invalid API key | 503 | "Invalid API key. Please check your configuration." |
| Timeout | 504 | "The request timed out. Please try again." |
| Other API error | 502 | Forwarded error message |

---

## Data Model

```sql
conversations (
  id         TEXT PRIMARY KEY,   -- UUID v4
  created_at INTEGER NOT NULL,   -- Unix timestamp (ms)
  updated_at INTEGER NOT NULL
)

messages (
  id               TEXT PRIMARY KEY,
  conversation_id  TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender           TEXT NOT NULL CHECK(sender IN ('user', 'ai')),
  text             TEXT NOT NULL,
  created_at       INTEGER NOT NULL
)
```

Indexes on `messages.conversation_id` and `messages.created_at` for efficient history retrieval.

---

## Robustness & Validation

- Empty messages are rejected (400).
- Messages over 2000 characters are rejected (400).
- Invalid/malformed `sessionId` UUIDs are rejected (400).
- JSON body is capped at 10kb to prevent payload attacks.
- LLM/API failures return clean, user-friendly error messages — the backend never crashes.
- Frontend shows errors as styled "error" chat bubbles, never silent failures.
- Session history is fetched on reload from `sessionStorage`; if the session is not found on the backend (e.g., DB wiped), the session is silently cleared and a fresh one starts.

---

## Trade-offs & If I Had More Time

**What I'd add with more time:**
- **Streaming responses** — `streamText` with SSE so replies appear word-by-word instead of all at once. This is the biggest UX win.
- **Rate limiting** — per-IP rate limiting on the backend (e.g., with `express-rate-limit`) to prevent abuse.
- **Tool use / RAG** — instead of hardcoding the knowledge base in the system prompt, store FAQ entries in the DB and retrieve relevant ones dynamically (semantic search or simple keyword match).
- **Multiple sessions UI** — a sidebar to switch between past conversations.
- **Auth** — even lightweight session tokens would prevent session ID spoofing.
- **PostgreSQL migration** — SQLite is perfect here, but a Drizzle schema swap to Postgres is trivial. (Note: on Render's free tier the SQLite file lives on ephemeral disk, so chat history resets on redeploy/restart — Postgres or a persistent volume would fix this.)

**Intentional simplifications:**
- Auth skipped per spec.
- No Docker — local dev is fast enough, and the spec said no container wizardry required.
- Knowledge base is hardcoded in the prompt rather than stored in DB — simpler for this scale, but noted as a future improvement.



https://forms.spurnow.com/spur-eng-hiring-task
