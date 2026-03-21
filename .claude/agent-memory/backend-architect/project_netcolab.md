---
name: NetColab project overview
description: Tech stack, domain models, current frontend state, and agreed backend architecture
type: project
---

NetColab is a collaborative AI chat platform. The frontend is fully built as a React 18 / TypeScript / Vite app using shadcn/ui (Radix), TailwindCSS, Framer Motion, React Query, and React Router v6. All data is currently mock/in-memory — no backend exists yet (as of March 2026).

**Domain models (from src/types/chat.ts and src/data/chatRooms.ts):**
- User: id, name, avatar (single letter), color (enum: cyan/pink/amber/violet/green), isOnline
- ChatMessage: id, userId, content, timestamp, type (user | ai | queued), model (AIModel?)
- ChatRoom: id, title, emoji, lastActivity, createdBy, participants: User[], messageCount, messages, versions
- VersionEntry: id, userId, action (string), timestamp, messageId
- AIModel enum: gemini-2.5-flash, gemini-2.5-pro, gpt-5, gpt-5-mini, claude-4

**Key frontend behaviors (from Index.tsx):**
- handleSend: posts user message + triggers AI response (simulated 1.5–2.5s delay)
- handleQueue: adds message with type="queued" (no AI call yet)
- handleFlush: converts all queued→user, concatenates all queued contents, sends combined to AI (single response)
- currentUser hardcoded as MOCK_USERS[0] — no auth yet
- queuedMessages per-session only (no room-level queue persistence)

**Agreed backend architecture (BACKEND_ARCHITECTURE.md):**
- Language/framework: TypeScript + Fastify
- Primary DB: PostgreSQL (no ORM — raw SQL via postgres.js)
- Cache/presence/queue: Redis (TTL presence, sorted-set queue, pub/sub for scaling)
- Real-time: WebSockets via @fastify/websocket (ws)
- AI streaming: SSE for sender, WS broadcast for other room members
- AI SDK: Vercel AI SDK (@ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/google)
- Auth: JWT access token (15m) + refresh token rotation (HttpOnly cookie, 7d)
- Queue: Redis primary store, Postgres queue_items table as flush log/fallback
- Deployment v1: Railway (app + managed Postgres + Redis) + Vercel (frontend)
- Monorepo: apps/web + apps/api + packages/types (shared TypeScript types)

**Implementation phases:**
1. Foundation: auth + REST + Postgres schema (Week 1–2)
2. Real-time: WebSockets + presence (Week 3)
3. AI integration: streaming + version history (Week 4)
4. Queue/batch: full flush feature (Week 5)
5. Hardening: validation, rate limiting, cost tracking (Week 6+)

**Why:** Architecture designed from scratch in March 2026 — no prior backend exists.
**How to apply:** When building any backend feature, follow the conventions in BACKEND_ARCHITECTURE.md — API prefix /api/v1/, UUID PKs, cursor pagination, WS event naming (room:*, message:*, presence:*, ai:*, queue:*).
