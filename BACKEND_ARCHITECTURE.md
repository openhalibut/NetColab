# NetColab — Backend Architecture

> Designed March 2026. Written for a small team (2–4 engineers) building incrementally from zero.

---

## Table of Contents

1. [Technology Choices](#1-technology-choices)
2. [System Overview](#2-system-overview)
3. [API Design](#3-api-design)
4. [Database Schema](#4-database-schema)
5. [AI Integration Architecture](#5-ai-integration-architecture)
6. [Queue / Batch Flush Feature](#6-queuebatch-flush-feature)
7. [Real-time Layer](#7-real-time-layer)
8. [Auth](#8-auth)
9. [Deployment](#9-deployment)
10. [Implementation Phases](#10-implementation-phases)

---

## 1. Technology Choices

### Runtime & Framework: Node.js + Fastify

**Why Node.js:** The frontend is already TypeScript; sharing types between client and server (via a shared `packages/types` package in a monorepo) removes an entire class of drift bugs. Node's async I/O model is well-suited to the workload here — the server is mostly I/O-bound: waiting on database queries, broadcasting WebSocket events, and proxying streaming responses from AI providers.

**Why Fastify over Express:** Fastify has built-in JSON schema validation (via Ajv), structured logging (Pino), a plugin system that enforces proper separation of concerns, and is measurably faster. It is not a rewrite risk — the migration path from Express is straightforward if team preference changes.

**Why not Go / Python:** There is no CPU-bound work that warrants the compile overhead of Go for a v1. Python's async story (asyncio + FastAPI) is solid but adds an ecosystem context-switch for a team already in TypeScript. Revisit Go if the AI proxy layer becomes a bottleneck.

### Database: PostgreSQL (primary) + Redis (presence/queue state)

**PostgreSQL:** Relational data with strong consistency requirements — users, rooms, messages, version history. JSONB columns for message metadata avoid over-normalisation for fields that change shape (AI provider responses, tool call results). `pg` driver with `postgres.js` (faster than `pg` for modern Node.js).

**Redis:** Two jobs:
1. **Presence tracking** — who is online in which room. Redis hashes with TTL. Fast reads, acceptable loss on failure (presence re-establishes on reconnect).
2. **Room queue state** — queued prompts are per-room and per-session, not permanent records. Redis sorted sets preserve insertion order and allow atomic flush operations. Persisted to Postgres only when flushed.

**Why not MongoDB:** The data is inherently relational (rooms have participants, messages belong to rooms and users). A document store saves nothing and complicates joins.

**Why not a single Postgres for everything:** Storing ephemeral presence heartbeats in Postgres creates unnecessary write amplification (one row mutation per user per ~10 seconds). Redis is the right tool for TTL-based transient state.

### Real-time: WebSockets via `@fastify/websocket` (wraps `ws`)

Server-Sent Events (SSE) are simpler but unidirectional — the client cannot send presence heartbeats or typing indicators back over the same connection. WebSockets are the correct primitive for a bidirectional real-time collaboration feature.

A single WebSocket connection per client handles: room join/leave, incoming messages, outgoing messages, presence heartbeats, AI streaming tokens, and queue state sync. This avoids the complexity of managing multiple connection types per client.

**No Socket.io:** Socket.io's transport negotiation and namespace abstractions are not needed. Raw `ws` via the Fastify plugin is ~40% less overhead and keeps the protocol transparent.

### Message broker: None in Phase 1; Redis pub/sub for Phase 2+

For a single-instance server, the WebSocket connection map lives in memory. When horizontal scaling is needed (Phase 2), Redis pub/sub allows any server instance to fan out a message to all clients subscribed to a room regardless of which instance they are connected to.

### AI SDK: Vercel AI SDK (`ai` package)

Unified interface over Anthropic, OpenAI, and Google Gemini. Handles streaming (via `streamText`), non-streaming (`generateText`), and the response format normalization between providers. The SDK uses the official provider packages under the hood (`@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`) so upstream updates flow through cleanly.

---

## 2. System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (React)                     │
│   REST (TanStack Query)  +  WebSocket (single conn)     │
└───────────────────┬──────────────────────┬──────────────┘
                    │ HTTP                 │ WS
┌───────────────────▼──────────────────────▼──────────────┐
│               Fastify API Server                        │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  REST Routes│  │  WS Handler  │  │  AI Proxy     │  │
│  │  /api/v1/.. │  │  (events)    │  │  (streaming)  │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                  │           │
│  ┌──────▼────────────────▼──────────────────▼───────┐   │
│  │              Service Layer                        │  │
│  │  RoomService  MessageService  PresenceService     │  │
│  │  QueueService  AuthService    AIService           │  │
│  └──────┬──────────────────────────────┬────────────┘  │
│         │                              │                │
└─────────┼──────────────────────────────┼────────────────┘
          │                              │
  ┌───────▼──────┐              ┌────────▼───────┐
  │  PostgreSQL  │              │     Redis       │
  │  (persistent)│              │  (presence,     │
  │              │              │   queue state)  │
  └──────────────┘              └─────────────────┘
                                         │
                              ┌──────────▼─────────┐
                              │  AI Providers       │
                              │  Anthropic / OpenAI │
                              │  / Google           │
                              └────────────────────┘
```

---

## 3. API Design

### Principles

- All REST routes are prefixed `/api/v1/`
- Responses always follow `{ data: T }` on success, `{ error: { code, message } }` on failure
- HTTP 422 for validation errors (not 400), with field-level details
- Pagination uses cursor-based approach (`?cursor=<id>&limit=<n>`) not offset — offset pagination breaks when messages are inserted during scrollback
- WebSocket events are namespaced: `room:*`, `message:*`, `presence:*`, `ai:*`, `queue:*`

### REST Endpoints

#### Auth

```
POST   /api/v1/auth/register        Create account (email + password)
POST   /api/v1/auth/login           Returns { accessToken, refreshToken, user }
POST   /api/v1/auth/refresh         Rotate refresh token
POST   /api/v1/auth/logout          Revoke refresh token
GET    /api/v1/auth/me              Current user profile
PATCH  /api/v1/auth/me              Update name, avatar, color
```

#### Rooms

```
GET    /api/v1/rooms                List rooms (the catalog on the Home page)
POST   /api/v1/rooms                Create room { title, emoji }
GET    /api/v1/rooms/:roomId        Room detail + participant list
PATCH  /api/v1/rooms/:roomId        Update title, emoji (owner only)
DELETE /api/v1/rooms/:roomId        Soft-delete (owner only)
POST   /api/v1/rooms/:roomId/join   Add current user to room
DELETE /api/v1/rooms/:roomId/leave  Remove current user from room
```

#### Messages

```
GET    /api/v1/rooms/:roomId/messages          Paginated history
                                               ?cursor=<messageId>&limit=50
POST   /api/v1/rooms/:roomId/messages          Send message immediately (non-streaming)
                                               Body: { content, model }
POST   /api/v1/rooms/:roomId/messages/stream   Send + stream AI response
                                               Returns SSE stream for this single request
DELETE /api/v1/rooms/:roomId/messages/:msgId   Delete own message
```

Note: For streaming AI responses, this one endpoint uses SSE (not WebSocket) because SSE is a perfect fit for unidirectional server-push on a single HTTP request. The WebSocket handles all other real-time events. This is not a contradiction — it avoids multiplexing streaming tokens through the shared WS pipe.

#### Queue

```
GET    /api/v1/rooms/:roomId/queue             Current queue for a room (all users' queued items)
POST   /api/v1/rooms/:roomId/queue             Add a prompt to the queue
                                               Body: { content, model }
DELETE /api/v1/rooms/:roomId/queue/:itemId     Remove own queued item
POST   /api/v1/rooms/:roomId/queue/flush       Flush — send all queued prompts to AI
                                               Body: { model? } — override model for combined call
DELETE /api/v1/rooms/:roomId/queue             Clear queue without sending
```

#### Version History

```
GET    /api/v1/rooms/:roomId/versions          Paginated version entries
```

### WebSocket Protocol

One WebSocket connection per client, established at `/ws` with the JWT in the `Authorization` header (or `?token=` query param for browser clients).

#### Client → Server events

```jsonc
// Join a room (must call before receiving room events)
{ "type": "room:join", "roomId": "room-abc" }

// Leave a room
{ "type": "room:leave", "roomId": "room-abc" }

// Presence heartbeat (send every 10s while in a room)
{ "type": "presence:ping", "roomId": "room-abc" }

// Typing indicator
{ "type": "presence:typing", "roomId": "room-abc", "isTyping": true }
```

#### Server → Client events

```jsonc
// A new message arrived (from another user, or AI response in non-streaming mode)
{
  "type": "message:new",
  "roomId": "room-abc",
  "message": { /* ChatMessage shape */ }
}

// AI is streaming tokens — client appends to an in-progress bubble
{
  "type": "ai:token",
  "roomId": "room-abc",
  "messageId": "msg-xyz",  // stable ID for the in-progress AI message
  "token": "Here are"
}

// AI streaming complete
{
  "type": "ai:done",
  "roomId": "room-abc",
  "messageId": "msg-xyz",
  "model": "claude-4"
}

// AI error
{
  "type": "ai:error",
  "roomId": "room-abc",
  "messageId": "msg-xyz",
  "error": "rate_limit_exceeded"
}

// Someone's presence status changed
{
  "type": "presence:update",
  "roomId": "room-abc",
  "userId": "user-1",
  "isOnline": true
}

// Someone joined/left the room membership (not just presence)
{
  "type": "room:participant_joined",
  "roomId": "room-abc",
  "user": { /* User shape */ }
}

// Queue updated (someone added/removed/flushed)
{
  "type": "queue:updated",
  "roomId": "room-abc",
  "queue": [ /* QueueItem[] */ ]
}

// A version history entry was added
{
  "type": "version:new",
  "roomId": "room-abc",
  "entry": { /* VersionEntry shape */ }
}
```

---

## 4. Database Schema

Using PostgreSQL. All tables use UUID primary keys generated by the server (not auto-increment — UUIDs are safe to reference before insert confirmations and work across eventual replicas).

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy search on room titles

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  avatar        TEXT NOT NULL DEFAULT '',     -- single letter or URL in future
  color         TEXT NOT NULL DEFAULT 'cyan'  -- cyan|pink|amber|violet|green
                CHECK (color IN ('cyan','pink','amber','violet','green')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ                   -- soft delete
);

CREATE INDEX idx_users_email ON users (email);

-- ─── Refresh tokens (auth) ────────────────────────────────────────────────────

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,           -- store SHA-256 hash, not plain token
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- ─── Rooms ────────────────────────────────────────────────────────────────────

CREATE TABLE rooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  emoji         TEXT NOT NULL DEFAULT '💬',
  created_by    UUID NOT NULL REFERENCES users(id),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_rooms_last_activity ON rooms (last_activity DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_rooms_title_search  ON rooms USING GIN (title gin_trgm_ops);

-- ─── Room participants ────────────────────────────────────────────────────────

CREATE TABLE room_participants (
  room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at    TIMESTAMPTZ,
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX idx_room_participants_user ON room_participants (user_id) WHERE left_at IS NULL;

-- ─── Messages ─────────────────────────────────────────────────────────────────

CREATE TYPE message_type AS ENUM ('user', 'ai', 'queued');

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),         -- NULL for AI messages
  content     TEXT NOT NULL,
  type        message_type NOT NULL DEFAULT 'user',
  model       TEXT,                               -- ai model used, if any
  -- Metadata for AI messages: token counts, latency, provider response id
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- Cursor pagination: clients request messages before/after a given ID
-- The covering index on (room_id, created_at, id) supports both scrollback
-- and the "latest messages" query efficiently.
CREATE INDEX idx_messages_room_cursor
  ON messages (room_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

-- ─── Queue items (overflow to Postgres if Redis unavailable) ─────────────────
-- Primary store is Redis; this table is the flush log + fallback.

CREATE TABLE queue_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  model       TEXT NOT NULL,
  queued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  flushed_at  TIMESTAMPTZ,           -- NULL = still pending
  message_id  UUID REFERENCES messages(id)  -- set after flush creates a message
);

CREATE INDEX idx_queue_items_room_pending
  ON queue_items (room_id, queued_at ASC)
  WHERE flushed_at IS NULL;

-- ─── Version history ──────────────────────────────────────────────────────────

CREATE TABLE version_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  message_id  UUID REFERENCES messages(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_version_entries_room ON version_entries (room_id, created_at DESC);

-- ─── Trigger: update rooms.last_activity & message_count on insert ───────────

CREATE OR REPLACE FUNCTION update_room_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rooms
  SET
    last_activity = NEW.created_at,
    message_count = message_count + 1
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_message_insert
AFTER INSERT ON messages
FOR EACH ROW
WHEN (NEW.type != 'queued')
EXECUTE FUNCTION update_room_on_message();
```

### Redis Key Conventions

```
presence:{roomId}:{userId}     STRING  "1"  TTL=30s  (refreshed by heartbeat ping)
presence:{roomId}              SET      — members are userIds currently online
queue:{roomId}                 ZSET     score=queued_at_epoch, member=JSON(QueueItem)
typing:{roomId}                SET      members are userIds currently typing  TTL=5s per member
```

---

## 5. AI Integration Architecture

### Provider abstraction

All AI calls go through a single `AIService` that wraps the Vercel AI SDK. The service maps the frontend's `AIModel` string (`"claude-4"`, `"gpt-5"`, etc.) to provider-specific model identifiers.

```
src/services/ai/
  AIService.ts          — public interface: streamCompletion(), generateCompletion()
  providers.ts          — model registry: maps AIModel enum → SDK provider + model id
  buildPrompt.ts        — conversation history → messages array (with system prompt)
  costTracker.ts        — log token usage to messages.meta for cost visibility
```

**Model registry example:**

```typescript
// src/services/ai/providers.ts
import { anthropic } from '@ai-sdk/anthropic';
import { openai }    from '@ai-sdk/openai';
import { google }    from '@ai-sdk/google';

export const MODEL_REGISTRY = {
  'claude-4':         anthropic('claude-opus-4-5'),
  'gpt-5':            openai('gpt-4o'),           // update when gpt-5 GA
  'gpt-5-mini':       openai('gpt-4o-mini'),
  'gemini-2.5-flash': google('gemini-2.5-flash'),
  'gemini-2.5-pro':   google('gemini-2.5-pro'),
} as const;
```

### Streaming flow

```
Client (WS)                      Server                       AI Provider
    │                               │                               │
    │  POST /api/v1/rooms/:id/       │                               │
    │  messages/stream              │                               │
    ├──────────────────────────────►│                               │
    │                               │ 1. persist user message       │
    │                               │ 2. create placeholder AI msg  │
    │                               │    (id assigned immediately)  │
    │                               │ 3. streamText(messages)       │
    │                               ├──────────────────────────────►│
    │                               │                               │
    │  SSE: ai:token "Here "        │◄── chunk ─────────────────────┤
    │◄──────────────────────────────┤  broadcast ai:token over WS   │
    │  SSE: ai:token "are "         │◄── chunk ─────────────────────┤
    │◄──────────────────────────────┤  to all room members          │
    │  SSE: ai:done                 │◄── [DONE] ────────────────────┤
    │◄──────────────────────────────┤                               │
    │                               │ 4. update AI message in DB    │
    │                               │    (full content + meta)      │
    │                               │ 5. emit message:new over WS   │
    │                               │    to all room members        │
```

The SSE response is for the _sender_ only (gives them a fast feedback loop). The WebSocket broadcast of `ai:token` ensures all _other_ room participants also see tokens arriving in real time.

### Rate limiting and cost controls

- Per-user rate limit: 20 AI requests per minute (Redis sliding window)
- Per-room rate limit: 60 AI requests per minute (prevents a busy room from overwhelming a single API key)
- Token budget per request: cap `maxTokens` at 2048 for chat responses; configurable per room in a future phase
- All token counts stored in `messages.meta.usage` as `{ inputTokens, outputTokens }` for cost attribution
- Single env var per provider: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`
- In Phase 2: add a `model_budgets` table and let room owners set monthly token limits

---

## 6. Queue / Batch Flush Feature

This is the most novel feature — it requires careful design to work correctly in a multi-user room.

### Semantics (derived from frontend behavior)

1. Any user can add prompts to the room's queue at any time.
2. The queue is shared and visible to all room participants (broadcast `queue:updated` on every change).
3. Any participant can trigger the flush.
4. On flush:
   - All queued prompts are concatenated into a structured batch prompt.
   - One AI call is made on behalf of the room (not any individual user).
   - The result is a single AI message attributed to `userId = null`.
   - All queue items are marked flushed and the queue is cleared.
   - A version history entry is created: `"N prompts flushed by <user>"`.

### Server-side flush implementation

```
POST /api/v1/rooms/:roomId/queue/flush

1. BEGIN TRANSACTION
2. Fetch all pending queue_items for roomId (ordered by queued_at ASC)
3. If empty → return 422 "Queue is empty"
4. Mark all items flushed_at = now() in queue_items
5. Build batch prompt:
      SYSTEM: "You are a collaborative AI assistant. Multiple team members have
               queued prompts. Address each one coherently in a single response,
               using the contributor's name where helpful."
      USER (per item): "[<userName>]: <content>"
6. Create placeholder message row (type='ai', content='', model=<chosen model>)
7. COMMIT
8. Stream AI response, broadcasting ai:token over WS to room
9. On complete: UPDATE message SET content = <full>, meta = <usage>
10. DELETE queue:{roomId} from Redis
11. Emit queue:updated with empty array over WS
12. Emit version:new entry over WS
```

### Why Redis as primary queue store (not Postgres)

Queue items are added and removed frequently, and the typical queue lifetime is minutes. Writing each keypress to Postgres would be premature. Redis sorted sets give O(log N) add/remove and O(N) range queries. On flush, items are written to Postgres as historical records. On Redis failure, the queue_items table serves as a fallback (items with `flushed_at IS NULL`).

### Preventing double-flush race condition

Use a Redis `SET queue:{roomId}:flush_lock NX EX 30` lock before executing the flush. If the lock already exists, return 409 Conflict. Release the lock after the flush completes (or after 30s timeout). This prevents two users clicking "Send all to AI" simultaneously from triggering two AI calls.

---

## 7. Real-time Layer

### Connection lifecycle

```
Client connects to /ws with Bearer token
  → Server validates JWT
  → Server registers conn in memory: Map<userId, WebSocket>
  → Server sends "connected" ack

Client sends room:join { roomId }
  → Server validates user is a participant
  → Server adds conn to room's subscriber set: Map<roomId, Set<userId>>
  → Server sets presence key in Redis (TTL 30s)
  → Server broadcasts presence:update to room
  → Server sends current queue state to joining client

Client disconnects (or heartbeat times out)
  → Server removes conn from all room subscriber sets
  → Server deletes presence key from Redis
  → Server broadcasts presence:update isOnline=false to affected rooms
```

### Fan-out broadcast

```typescript
// Broadcast to all users in a room except optionally the sender
function broadcastToRoom(
  roomId: string,
  event: WsEvent,
  excludeUserId?: string
): void {
  const subscribers = roomSubscribers.get(roomId) ?? new Set();
  for (const userId of subscribers) {
    if (userId === excludeUserId) continue;
    const ws = connections.get(userId);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }
}
```

### Horizontal scaling (Phase 2)

Replace the in-memory Maps with a Redis pub/sub channel per room (`ws:room:{roomId}`). Each server instance subscribes to channels for rooms that have connected clients. A message published to a channel is received by all instances and fan-out to their local connections.

---

## 8. Auth

### Strategy: JWT (access) + refresh token rotation

- **Access token:** short-lived (15 min), signed HS256 with `JWT_SECRET`. Sent as `Authorization: Bearer <token>`.
- **Refresh token:** long-lived (7 days), stored as a SHA-256 hash in the `refresh_tokens` table. Issued as an `HttpOnly`, `SameSite=Strict` cookie. Rotated on every `/auth/refresh` call (old token revoked, new token issued).
- No sessions table — stateless access tokens mean the server does not need to look up a session on every request.
- The WebSocket connection authenticates using the access token in the `Authorization` header or a `?token=` query param (browser WebSocket API doesn't support custom headers — query param is acceptable when the token is short-lived).

### Password hashing: `bcrypt` with cost factor 12

### Future: OAuth2 (Google, GitHub) via `@fastify/oauth2`

---

## 9. Deployment

### Phase 1 (MVP): Single server, single region

```
┌─────────────────────────────────────────────────┐
│  Railway / Render / Fly.io                       │
│                                                 │
│  ┌──────────────┐  ┌────────────┐  ┌─────────┐  │
│  │  Fastify app │  │ PostgreSQL │  │  Redis  │  │
│  │  (1 instance)│  │ (managed)  │  │(managed)│  │
│  └──────────────┘  └────────────┘  └─────────┘  │
└─────────────────────────────────────────────────┘
```

**Recommended: Railway** — deploy Postgres and Redis as managed services alongside the app in the same project. The free/hobby tier is sufficient for an MVP. Config is driven entirely by environment variables; no Dockerfile needed initially (Railway auto-detects Node.js).

The frontend (Vite build) is deployed separately to **Vercel** or **Netlify** — static assets, zero config, instant CDN.

**Environment variables the backend needs:**

```
DATABASE_URL          # postgres://...
REDIS_URL             # redis://...
JWT_SECRET            # random 64-byte hex string
JWT_REFRESH_SECRET    # separate secret for refresh tokens
ANTHROPIC_API_KEY
OPENAI_API_KEY
GOOGLE_AI_API_KEY
CORS_ORIGIN           # frontend origin (https://netcolab.vercel.app)
PORT                  # default 3000
NODE_ENV              # production
```

### Phase 2: Containerized, horizontally scalable

```
Fly.io multi-region OR AWS ECS Fargate
  - 2–4 app instances behind a load balancer
  - Sticky sessions on the load balancer (for WS connections) OR Redis pub/sub broadcast
  - RDS PostgreSQL (Multi-AZ)
  - ElastiCache Redis (cluster mode)
  - CloudFront in front of frontend
```

### Migrations: `node-postgres-migrate` or `db-migrate`

Keep migrations in `db/migrations/` as plain numbered SQL files. Run on deploy before starting the server. No ORM — raw SQL gives full control over indexes and query plans. Use `postgres.js` tagged template literals for queries (automatic parameterization, no injection risk).

---

## 10. Implementation Phases

### Phase 1 — Foundation (Week 1–2)
Goal: Real messages persisted, auth working, frontend connected to real API.

- [ ] Project scaffold: Fastify + TypeScript, folder structure, env config
- [ ] Database: Postgres schema (users, rooms, messages, room_participants), migrations
- [ ] Auth: register, login, refresh, `/me` endpoint, JWT middleware
- [ ] REST: rooms CRUD, messages list + create (no AI yet)
- [ ] Frontend integration: replace mock data with TanStack Query fetches

### Phase 2 — Real-time (Week 3)
Goal: Multiple browser tabs see each other's messages live.

- [ ] Redis setup (presence + typing)
- [ ] WebSocket handler: connect/auth, room:join/leave
- [ ] Presence: heartbeat, online/offline broadcast, UserPresence component wired
- [ ] Message broadcast: when a message is saved, fan-out `message:new` to room subscribers
- [ ] Typing indicators

### Phase 3 — AI Integration (Week 4)
Goal: Real AI responses replacing simulated delays.

- [ ] AIService with Vercel AI SDK, provider registry
- [ ] Non-streaming: `POST /messages` saves user msg + calls AI + saves AI msg + broadcasts
- [ ] Streaming: `/messages/stream` SSE + WS token broadcast
- [ ] Version history: auto-create entries on message send, flush, join
- [ ] Rate limiting middleware (per-user, per-room)

### Phase 4 — Queue / Batch (Week 5)
Goal: Full queue feature working multi-user.

- [ ] Redis queue store per room
- [ ] REST: queue CRUD endpoints
- [ ] Flush endpoint with flush-lock, batch prompt builder, AI call
- [ ] `queue:updated` WebSocket broadcast
- [ ] Frontend: wire ChatInput queue/flush to real endpoints

### Phase 5 — Hardening (Week 6+)
Goal: Production-ready.

- [ ] Input validation on all endpoints (Fastify JSON schema)
- [ ] Error handling middleware (structured error codes)
- [ ] Token usage logging (messages.meta.usage)
- [ ] API key rotation support (multiple keys per provider, round-robin)
- [ ] Cost visibility endpoint: `GET /api/v1/admin/usage`
- [ ] Basic admin: room moderation, user management
- [ ] Load testing (k6) on WS connection limits
- [ ] Horizontal scaling prep: Redis pub/sub broadcast

---

## Monorepo Structure (Recommended)

```
netcolab/
├── apps/
│   ├── web/               ← existing Vite React app (move here)
│   └── api/               ← Fastify backend
│       ├── src/
│       │   ├── plugins/   ← Fastify plugins (db, redis, auth, websocket)
│       │   ├── routes/    ← Route handlers (thin — delegate to services)
│       │   │   ├── auth.ts
│       │   │   ├── rooms.ts
│       │   │   ├── messages.ts
│       │   │   └── queue.ts
│       │   ├── services/  ← Business logic
│       │   │   ├── AuthService.ts
│       │   │   ├── RoomService.ts
│       │   │   ├── MessageService.ts
│       │   │   ├── PresenceService.ts
│       │   │   ├── QueueService.ts
│       │   │   └── ai/
│       │   │       ├── AIService.ts
│       │   │       ├── providers.ts
│       │   │       └── buildPrompt.ts
│       │   ├── ws/        ← WebSocket event handlers
│       │   │   └── handler.ts
│       │   ├── db/        ← Query functions (no ORM)
│       │   │   ├── users.ts
│       │   │   ├── rooms.ts
│       │   │   └── messages.ts
│       │   └── server.ts  ← Entry point
│       ├── db/
│       │   └── migrations/
│       └── package.json
└── packages/
    └── types/             ← Shared TypeScript types (User, ChatMessage, etc.)
        └── src/
            └── index.ts   ← Re-export from apps/web/src/types/chat.ts
```

The `packages/types` package eliminates the risk of the frontend and backend drifting on type definitions. Both apps import from `@netcolab/types`.

---

## Key Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Language | TypeScript (Node.js) | Shared types with frontend, team familiarity |
| Framework | Fastify | Built-in validation, fast, plugin ecosystem |
| Primary DB | PostgreSQL | Relational data, strong consistency, JSONB for metadata |
| Cache / Presence | Redis | TTL-based presence, atomic queue ops, pub/sub for scaling |
| Real-time | WebSockets (`ws`) | Bidirectional, no Socket.io overhead |
| AI streaming | SSE (sender) + WS broadcast (others) | SSE is the right primitive for a single streaming response; WS for fan-out |
| AI SDK | Vercel AI SDK | Unified multi-provider interface with streaming built-in |
| Auth | JWT + refresh token rotation | Stateless access tokens, secure refresh via HttpOnly cookie |
| Queue store | Redis primary, Postgres fallback | Ephemeral state belongs in Redis; Postgres for auditability |
| Deployment v1 | Railway (app + managed Postgres + Redis) | Fastest path from code to production, no DevOps overhead |
| Migrations | Plain SQL files | Full control, no ORM magic, deterministic |
