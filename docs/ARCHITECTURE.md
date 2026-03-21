# NetColab Architecture Design

## Overview

NetColab is a **collaborative agentic workspace** where multiple users share a real-time session to jointly steer and interact with AI models. The architecture must support:

- Multi-user real-time presence and message sync
- Multi-model AI routing (Claude, GPT-5, Gemini)
- Queued/batched prompt workflows
- Version history and session auditability
- Scalable room/workspace management

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│   React 18 + TypeScript + Vite                                   │
│   React Query (server state) · Socket.io-client (real-time)      │
│   shadcn/ui · TailwindCSS · Framer Motion                        │
└────────────────────────────┬─────────────────────────────────────┘
                             │  HTTPS / WSS
┌────────────────────────────▼─────────────────────────────────────┐
│                    API Server (BFF)                               │
│   Node.js + Hono  (TypeScript-native, edge-ready)                │
│   ├── REST endpoints  (/api/v1/...)                               │
│   ├── WebSocket server (Socket.io)                               │
│   ├── Auth middleware (JWT)                                       │
│   └── Rate limiting · CORS · Input validation                    │
└──────┬──────────────────┬────────────────────┬───────────────────┘
       │                  │                    │
┌──────▼──────┐  ┌────────▼────────┐  ┌───────▼──────────┐
│  Auth       │  │  Room / Chat    │  │  AI Proxy         │
│  Service    │  │  Service        │  │  Service          │
│             │  │                 │  │                   │
│  JWT issue  │  │  CRUD rooms     │  │  Route by model   │
│  Refresh    │  │  Message store  │  │  Anthropic API    │
│  tokens     │  │  Version log    │  │  OpenAI API       │
│  Sessions   │  │  Queue flush    │  │  Google AI API    │
└──────┬──────┘  └────────┬────────┘  └───────────────────┘
       │                  │
┌──────▼──────────────────▼────────────────────────────────┐
│                  PostgreSQL Database                       │
│  users · rooms · room_participants · messages · versions  │
└──────────────────────────────────────────────────────────┘
       │                  │
┌──────▼──────┐  ┌────────▼────────┐
│    Redis    │  │  Object Storage  │
│             │  │  (file uploads,  │
│  Pub/Sub    │  │   attachments)   │
│  Sessions   │  │  S3-compatible   │
│  Presence   │  └─────────────────┘
│  Caching    │
└─────────────┘
```

---

## Technology Stack

### Frontend (existing)
| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | React 18 + TypeScript | Already in place |
| Build tool | Vite | Already in place |
| UI components | shadcn/ui (Radix) + TailwindCSS | Already in place |
| Server state | TanStack React Query v5 | Already in place; pairs cleanly with REST APIs |
| Animations | Framer Motion | Already in place |
| Real-time | Socket.io-client | Pairs with Socket.io server; handles reconnection automatically |
| Forms | React Hook Form + Zod | Already in place |
| Routing | React Router v6 | Already in place |

### Backend (to be built)
| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Node.js 22 (LTS) | Same ecosystem as frontend; large package ecosystem |
| Framework | **Hono** | TypeScript-first, fast, minimal; runs on Node.js HTTP server (note: Socket.io requires a raw Node HTTP server — edge/serverless deployment is not possible with this stack) |
| WebSockets | **Socket.io** | Rooms, namespaces, reconnection, presence broadcast built-in |
| Database | **PostgreSQL 16** | Relational integrity for rooms/messages/users; JSONB for flexible metadata |
| ORM | **Drizzle ORM** | TypeScript-native, schema-as-code, lightweight, great DX |
| Cache / PubSub | **Redis** | Real-time pub/sub for cross-instance message broadcast; session store; presence TTL |
| Auth | **JWT + refresh tokens** | Access tokens are stateless (short-lived, 15 min); refresh tokens are stored in Redis for revocation support |
| AI routing | **Anthropic SDK + OpenAI SDK + Google Generative AI SDK** | One SDK per provider; routed by model identifier in request |
| Package manager | **npm** (existing) | Consistent with frontend; Bun can be adopted later if performance warrants it |

### Infrastructure
| Concern | Choice |
|---------|--------|
| Containerization | Docker + Docker Compose (dev), single Dockerfile per service |
| Hosting | Railway / Render / Fly.io (low-ops), or AWS ECS/GCP Cloud Run for scale |
| Object storage | Cloudflare R2 or AWS S3 |
| Secrets | Environment variables via `.env`; never committed |

---

## Data Model

### PostgreSQL Schema

```sql
-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  avatar      TEXT,                    -- image URL; NULL means use generated initials fallback
  color       TEXT NOT NULL CHECK (color IN ('cyan', 'pink', 'amber', 'violet', 'green')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Chat Rooms
CREATE TABLE rooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  emoji        TEXT NOT NULL DEFAULT '💬',
  created_by   UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  last_activity TIMESTAMPTZ DEFAULT now()
);

-- Room membership
CREATE TABLE room_participants (
  room_id    UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id),       -- NULL for ai messages
  content     TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('user', 'ai', 'queued')),
  -- 'queued' means staged but not yet sent to AI; becomes 'user' input context after flush
  model       TEXT,                            -- ai model identifier (e.g. "claude-sonnet-4-5")
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Version / audit log
CREATE TABLE versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL CHECK (action IN ('message_sent', 'message_queued', 'flush', 'participant_joined', 'participant_removed', 'room_updated')),
  message_id  UUID REFERENCES messages(id) ON DELETE SET NULL,  -- SET NULL, not CASCADE, to preserve audit history
  snapshot    TEXT,           -- optional JSON snapshot of message content at time of action
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_messages_room_id ON messages(room_id, created_at);
CREATE INDEX idx_versions_room_id ON versions(room_id, created_at);
CREATE INDEX idx_room_participants_user ON room_participants(user_id);
```

---

## REST API Design

Base path: `/api/v1`

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create user account |
| POST | `/auth/login` | Issue JWT + refresh token |
| POST | `/auth/refresh` | Rotate access token |
| POST | `/auth/logout` | Revoke refresh token |
| GET  | `/auth/me` | Current user profile |

### Rooms
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/rooms` | List user's rooms |
| POST | `/rooms` | Create new room |
| GET  | `/rooms/:id` | Room details + participants |
| PATCH | `/rooms/:id` | Update title / emoji |
| DELETE | `/rooms/:id` | Delete room (owner only) |
| POST | `/rooms/:id/participants` | Invite user |
| DELETE | `/rooms/:id/participants/:userId` | Remove participant |

### Messages
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/rooms/:id/messages` | Paginated message history |
| POST | `/rooms/:id/messages` | Post user or queued message |
| PATCH | `/rooms/:id/messages/:msgId` | Promote queued → user (partial flush) |
| POST | `/rooms/:id/flush` | Flush all queued → AI |

### Versions
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/rooms/:id/versions` | Audit log for room |

### AI Proxy
| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/complete` | Route prompt to selected model (SSE streaming) |

All list endpoints support `?limit=20&cursor=<uuid>` cursor-based pagination.

---

## Real-Time Architecture (Socket.io)

Clients join a Socket.io room matching their `roomId`. The server broadcasts events:

```
Client connects → authenticates with JWT via socket handshake
  → joins room channel: socket.join(`room:${roomId}`)

Events (server → clients in room):
  message:new       { message }          — new user/ai/queued message
  message:updated   { message }          — queued→user type change
  presence:join     { userId, name }     — user entered the room
  presence:leave    { userId }           — user left / disconnected
  ai:typing         { model }            — AI is generating
  ai:done           { messageId }        — AI response complete

Events (client → server):
  message:send      { content, model, type }
  message:queue     { content, model }
  room:flush        { }
```

**Presence via Redis TTL:**
- On join, `SET presence:{roomId}:{userId} 1 EX 30`
- Heartbeat every 20s to renew TTL
- On expiry/disconnect, broadcast `presence:leave`

**Multi-instance scaling:**
- Socket.io Redis adapter broadcasts events across all server instances
- Each instance connects to same Redis pub/sub channel

---

## AI Proxy Service

The AI Proxy routes requests to the correct provider SDK based on the `model` field:

```
model: "claude-sonnet-4-5"  → Anthropic SDK
model: "claude-opus-4-5"    → Anthropic SDK
model: "gpt-5"              → OpenAI SDK
model: "gpt-5-mini"         → OpenAI SDK
model: "gemini-2.5-flash"   → Google Generative AI SDK
model: "gemini-2.5-pro"     → Google Generative AI SDK
```

Responses are streamed as **Server-Sent Events (SSE)** from the `/ai/complete` endpoint to the requesting client. The server then broadcasts the completed (or chunk-by-chunk) AI response to all room members over the existing Socket.io room channel so every participant sees the output in real time. Streaming chunks should be buffered server-side if broadcasting per-chunk to avoid overwhelming Socket.io under high-throughput models.

### Batch (flush) flow
1. Client calls `POST /rooms/:id/flush`
2. Server loads all `type=queued` messages for the room, sorted by `created_at`
3. Concatenates content with user attribution: `[UserA]: prompt1\n\n[UserB]: prompt2`
4. **Check combined token count against the selected model's context window limit before sending.** If over the limit, return a 422 with a descriptive error rather than letting the provider reject it.
5. Sends combined context to selected model
6. Saves AI response as a new `type=ai` message; records a `flush` audit entry in `versions`
7. Broadcasts `message:new` (AI response) to all room members via Socket.io
8. **Failure handling:** wrap steps 5–6 in a database transaction. If the AI call fails, no partial records are written; the queued messages remain intact for retry.

---

## Project Structure (proposed)

```
NetColab/
├── src/                    # Frontend (existing)
│   ├── components/
│   ├── pages/
│   ├── data/               # Mock data → replaced by API calls
│   ├── hooks/
│   ├── lib/
│   └── types/
│
├── server/                 # Backend (new)
│   ├── src/
│   │   ├── index.ts        # Entry point, Hono app + Socket.io
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── rooms.ts
│   │   │   ├── messages.ts
│   │   │   └── ai.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── room.service.ts
│   │   │   ├── message.service.ts
│   │   │   └── ai.service.ts
│   │   ├── db/
│   │   │   ├── schema.ts   # Drizzle schema
│   │   │   ├── client.ts   # DB connection
│   │   │   └── migrations/
│   │   ├── realtime/
│   │   │   └── socket.ts   # Socket.io event handlers
│   │   ├── middleware/
│   │   │   ├── auth.ts     # JWT verification
│   │   │   └── validate.ts # Zod request validation
│   │   └── lib/
│   │       ├── redis.ts
│   │       └── env.ts      # Validated env vars (zod)
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   └── ARCHITECTURE.md     # This file
│
├── docker-compose.yml      # Local dev: postgres + redis
├── .env.example
└── package.json            # Root-level npm workspaces config (shared types between frontend and backend)
```

> **Shared types:** Define a `packages/shared` (or `server/src/types`) package exported via npm workspaces so that the frontend and backend can import the same TypeScript interfaces for API request/response payloads and Socket.io event payloads. This prevents type drift between the two layers.

---

## Implementation Milestones

### Phase 1 — Backend Foundation
- [ ] Scaffold `server/` with Hono + TypeScript
- [ ] Docker Compose for PostgreSQL + Redis
- [ ] Drizzle schema + migrations
- [ ] Auth endpoints (register, login, JWT refresh)

### Phase 2 — Room & Message APIs
- [ ] CRUD for rooms and participants
- [ ] Message persistence (send, queue, paginated history)
- [ ] Version/audit log endpoint

### Phase 3 — Real-Time
- [ ] Socket.io server integration
- [ ] Presence tracking with Redis TTL
- [ ] Room broadcast for new messages and presence events

### Phase 4 — AI Integration
- [ ] Multi-model AI proxy service
- [ ] SSE streaming responses
- [ ] Batch flush endpoint

### Phase 5 — Frontend Migration
- [ ] Replace mock data with React Query + REST calls
- [ ] Connect Socket.io client for live updates
- [ ] Add authentication UI (login/register)

### Phase 6 — Polish & Production
- [ ] Rate limiting on AI endpoints
- [ ] E2E tests (Playwright: workspace create, chat, flush)
- [ ] CI/CD pipeline
- [ ] Deployment (Railway / Fly.io)

---

## Scalability Considerations

| Concern | Approach |
|---------|----------|
| Horizontal scaling | Stateless API servers; Redis adapter for Socket.io |
| AI cost control | Rate limit AI calls per room per minute; queue depth cap |
| Message volume | Cursor-based pagination; archive old messages to cold storage |
| DB connections | Connection pooling via PgBouncer or the underlying `postgres.js` driver's built-in pool (Drizzle itself does not provide pooling) |
| Real-time load | Redis pub/sub decouples message fan-out from API servers |

---

## Security Considerations

- JWT access tokens (15 min TTL) + refresh tokens (7 days, Redis-stored for revocation)
- All AI API keys server-side only
- Input validation with Zod on all endpoints
- Parameterized queries via Drizzle (no raw SQL interpolation)
- Rate limiting: 60 req/min per IP, 10 AI calls/min per room
- CORS restricted to known frontend origin
- HTTPS enforced in production

---

## Potential Challenges & Points to Notice

### 1. Hono + Socket.io Integration
Hono is designed around a request/response model and does not natively manage a raw `http.Server`. Socket.io requires control of the underlying Node.js `http.Server` to upgrade HTTP connections to WebSockets. You must create the `http.Server` explicitly, attach Hono as the request handler, and pass the same server instance to `new Server(httpServer)`. Deploying Hono to edge workers (Cloudflare Workers) is therefore **incompatible** with Socket.io — serverless/edge deployment must be ruled out for any instance running the WebSocket server.

### 2. AI Streaming: SSE vs. WebSocket Fan-out
The `/ai/complete` endpoint streams via SSE to the requesting client, but all room participants need to see the AI response live. The server must act as a relay: consume the SSE stream from the AI provider, buffer or forward chunks, and broadcast them over the Socket.io room channel. Decide early whether to:
- Broadcast each token chunk (low latency but high Socket.io message rate)
- Buffer into sentences / flush intervals (smoother UX, slightly higher latency)

Without this relay design the non-requesting participants only see the AI response after it is fully saved.

### 3. Batch Flush: Context Window Limits
The flush flow concatenates all queued messages into a single prompt. Large rooms with many queued messages can easily exceed an AI model's context window (e.g. GPT-4o: 128k tokens, Gemini 2.5 Pro: 1M tokens, Claude: 200k tokens). Without explicit token counting (using `tiktoken` or provider-specific counting APIs) before the API call, the server will receive a cryptic provider error at runtime. Add a token budget check and return a user-friendly error or prompt the user to reduce the queue.

### 4. Presence Heartbeat vs. TTL Timing
The presence TTL is set to 30 seconds and the heartbeat fires every 20 seconds. A single missed heartbeat (due to a brief network stall) leaves only 10 seconds before the TTL expires, causing a false `presence:leave` event. Recommendations:
- Increase the TTL to at least 3× the heartbeat interval (e.g. 60 s TTL / 20 s heartbeat)
- On reconnect, re-broadcast `presence:join` to reconcile state

### 5. Multi-Instance Presence Race Conditions
When a user is connected to instance A and their TCP connection drops, instance A fires `presence:leave`. If the client simultaneously reconnects to instance B, both events travel through Redis pub/sub. Without a distributed lock or a reconciliation step (check Redis presence key before broadcasting leave), clients in the room can see a spurious leave/rejoin flicker. Use a small delay (e.g. 2–3 s) before broadcasting `presence:leave` and cancel it if a new connection for the same `userId`/`roomId` appears.

### 6. Audit Trail Integrity on Message Deletion
The `versions` table references `messages(id)` with `ON DELETE SET NULL` (after the schema fix above). However, the full content of deleted messages is then lost from the audit trail. If regulatory or collaborative-replay requirements exist, store a `snapshot TEXT` column in `versions` to capture the message content at the time of the action. This is already reflected in the schema above.

### 7. `last_activity` Update Pattern in `rooms`
The `last_activity` column must be kept up-to-date on every new message insert. Without a PostgreSQL trigger, the application must issue a separate `UPDATE rooms SET last_activity = now() WHERE id = $roomId` alongside every `INSERT INTO messages`. Consider adding a trigger to enforce this automatically and avoid drift if a direct DB insert bypasses the application layer.

### 8. No OAuth / Social Login
The current auth design only covers email + password. Most users expect "Sign in with Google" (or GitHub). Retrofitting OAuth after the auth service is built is non-trivial: the `users` table needs a `provider` and `provider_id` column, and the JWT flow changes. Plan the schema for it from Phase 1 even if the UI for it ships in Phase 5.

### 9. WebSocket Rate Limiting
REST endpoints are rate-limited but Socket.io events (`message:send`, `message:queue`) are not. A compromised or buggy client can flood the room with hundreds of events per second. Add per-socket rate limiting in the Socket.io middleware layer (e.g. `socket-ratelimiter` or a simple Redis counter keyed by `userId`).

### 10. Shared Types Between Frontend and Backend
As the API grows, request/response payload types and Socket.io event shapes will be duplicated across `src/` (frontend) and `server/src/` (backend). Introduce an npm workspace (root `package.json` with `"workspaces": ["src", "server", "packages/shared"]`) and a `packages/shared` module from the start to keep types in sync.

### 11. Testing Strategy Gap
Phases 1–5 define no unit or integration tests. E2E tests in Phase 6 will catch regression too late. Recommendation:
- Add unit tests for services (auth, AI routing, queue logic) from Phase 1 using Vitest
- Add integration tests for REST endpoints (using `supertest` or Hono's test helpers) from Phase 2
- Reserve Playwright E2E for Phase 6

### 12. Model Identifier Fragility
The `model` column stores free-text identifiers (e.g. `"gpt-5"`). If a model is renamed or versioned by its provider, historical records will reference an identifier that no longer resolves. Consider pinning to canonical, versioned identifiers (e.g. `"claude-sonnet-4-5-20250915"`) and maintaining a mapping table or config file for display names.
