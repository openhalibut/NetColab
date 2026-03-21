---
name: NetColab project overview
description: Tech stack, domain models, and current frontend state for NetColab
type: project
---

NetColab is a collaborative AI chat platform. The frontend is fully built as a React 18 / TypeScript / Vite app using shadcn/ui (Radix), TailwindCSS, Framer Motion, React Query, and React Router v6. All data is currently mock/in-memory — no backend exists yet.

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

**Why:** Backend architecture was designed from scratch in March 2026 — no prior backend exists.
**How to apply:** When building backend features, align with these exact field names and behaviors to minimise frontend migration effort.
