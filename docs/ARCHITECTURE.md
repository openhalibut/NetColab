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
| Framework | **Hono** | TypeScript-first, fast, minimal; runs on Node/Bun/edge workers |
| WebSockets | **Socket.io** | Rooms, namespaces, reconnection, presence broadcast built-in |
| Database | **PostgreSQL 16** | Relational integrity for rooms/messages/users; JSONB for flexible metadata |
| ORM | **Drizzle ORM** | TypeScript-native, schema-as-code, lightweight, great DX |
| Cache / PubSub | **Redis** | Real-time pub/sub for cross-instance message broadcast; session store; presence TTL |
| Auth | **JWT + refresh tokens** | Stateless; pairs well with Redis-backed refresh token revocation |
| AI routing | Per-SDK calls | Anthropic SDK, OpenAI SDK, Google Generative AI SDK |
| Package manager | npm (existing) or Bun | Bun compatible with existing setup |

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
  avatar      TEXT NOT NULL,           -- single letter or image URL
  color       TEXT NOT NULL,           -- cyan | pink | amber | violet | green
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
  model       TEXT,                            -- ai model identifier
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Version / audit log
CREATE TABLE versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  message_id  UUID REFERENCES messages(id),
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
model: "claude-4"         → Anthropic SDK  (claude-sonnet-4-6 or opus)
model: "gpt-5"            → OpenAI SDK
model: "gpt-5-mini"       → OpenAI SDK
model: "gemini-2.5-flash" → Google Generative AI SDK
model: "gemini-2.5-pro"   → Google Generative AI SDK
```

Responses are streamed as **Server-Sent Events (SSE)** or via WebSocket chunks back to the room. All AI API keys are held server-side only — never exposed to the client.

### Batch (flush) flow
1. Client calls `POST /rooms/:id/flush`
2. Server loads all `type=queued` messages for the room
3. Concatenates content with user attribution: `[UserA]: prompt1\n\n[UserB]: prompt2`
4. Sends combined context to selected model
5. Saves AI response, broadcasts `message:new` to room

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
└── .env.example
```

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
| DB connections | Connection pooling via PgBouncer or Drizzle's built-in pooling |
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
