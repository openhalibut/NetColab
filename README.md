# NetColab Developer Guide (Initial)

NetColab is a collaborative platform where users share a session of agentic workflow control.  
The current app is a frontend prototype for multi-user workspaces and shared AI-assisted chat sessions.

## What’s in this repo

- React + TypeScript + Vite application
- TailwindCSS + shadcn/ui component setup
- Routing for workspace list and session views
- Mock data for rooms, messages, users, and version history
- Vitest test setup and Playwright config scaffolding

## Quick start

Requirements:

- Node.js 20+ (recommended)
- npm

Install and run:

```bash
npm install
npm run dev
```

App runs at `http://localhost:8080`.

## Core scripts

- `npm run dev` — Start local dev server
- `npm run build` — Production build
- `npm run preview` — Preview built app
- `npm run lint` — ESLint checks
- `npm run test` — Run unit tests once
- `npm run test:watch` — Run tests in watch mode

## Product model (current prototype)

The prototype currently models:

- **Workspaces / Rooms**: Landing page lists shared sessions (`/`)
- **Session view**: Chat interface for a room (`/chat/:roomId`)
- **Participants**: Presence and avatars
- **Prompt flow**: Send immediate prompts or queue multiple prompts then flush
- **History**: Version timeline of key session actions

All data is currently mocked in `src/data/`.

## Project structure

```text
src/
  components/        # Feature components + UI primitives
  data/              # Mock rooms/messages/users
  hooks/             # Shared React hooks
  lib/               # Utilities
  pages/             # Route-level screens (Home, Session, NotFound)
  test/              # Vitest setup + example tests
  types/             # Shared TypeScript models
```

## Key files to know

- `src/pages/Home.tsx` — Workspace list and navigation
- `src/pages/Index.tsx` — Main collaborative session UI
- `src/data/mockData.ts` — Seed users/messages/history
- `src/data/chatRooms.ts` — Workspace/room catalog
- `src/types/chat.ts` — Core domain types
- `src/App.tsx` — App providers and routes

## Development conventions

- Prefer typed domain models from `src/types/` over ad-hoc object shapes.
- Keep UI concerns in components; keep reusable logic in hooks or `lib`.
- Extend mock data first when prototyping UX before wiring backend APIs.
- Maintain route-level behavior in `src/pages/` and shared components in `src/components/`.

## Next implementation milestones

- Replace mock data with API-backed room/session state.
- Introduce real-time collaboration (presence + message updates).
- Add persistence for queued prompts and version history.
- Add end-to-end tests for workspace creation, sharing, and session collaboration flows.
