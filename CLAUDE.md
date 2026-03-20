# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language, Claude generates them via streaming tool use, and results render in an isolated iFrame with a Monaco code editor alongside.

## Commands

```bash
npm run dev          # Start dev server (Turbopack, http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run all tests (vitest)
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx  # Single test file
npx prisma generate  # Regenerate Prisma client (required after schema changes)
npx prisma migrate dev  # Run database migrations
npm run db:reset     # Reset database (destructive)
npm run setup        # Fresh install: npm install + prisma generate + migrate
```

**Note:** `cross-env` is used in scripts because the project runs on Windows. `node-compat.cjs` is required via `NODE_OPTIONS` to fix Node.js 25+ removing global `localStorage`/`sessionStorage` on the server side.

## Architecture

### Core Flow

1. User sends message → `ChatContext` calls `/api/chat` with messages + serialized file system
2. `/api/chat` (route handler) streams Claude's response using Vercel AI SDK (`streamText`)
3. Claude uses two tools: `str_replace_editor` (create/view/edit files) and `file_manager` (rename/delete)
4. Tools operate on an in-memory `VirtualFileSystem` — never touches disk
5. `FileSystemContext` updates UI → Babel transforms JSX in-browser → iFrame renders preview

### Key Directories

- **`src/app/api/chat/route.ts`** — Main AI endpoint. Configures system prompt, tools, and streaming. Saves project to DB after response.
- **`src/lib/file-system.ts`** — `VirtualFileSystem` class. In-memory file tree that serializes to JSON for DB persistence.
- **`src/lib/tools/`** — AI tool definitions (`str-replace.ts`, `file-manager.ts`) used by the chat endpoint.
- **`src/lib/prompts/generation.tsx`** — System prompt for Claude that guides component generation.
- **`src/lib/provider.ts`** — Language model provider. Returns `MockLanguageModel` when no API key, otherwise `claude-haiku-4-5` via `@ai-sdk/anthropic`.
- **`src/lib/contexts/`** — React contexts for chat state (`useChat` from AI SDK) and file system state.
- **`src/lib/transform/jsx-transformer.ts`** — Babel pipeline that transforms JSX to browser-executable ES modules with import maps (esm.sh CDN).
- **`src/components/preview/PreviewFrame.tsx`** — Sandboxed iFrame rendering of generated components.
- **`src/actions/`** — Server actions for auth (signUp/signIn/signOut) and project CRUD.
- **`src/middleware.ts`** — JWT auth middleware protecting `/api/projects` and `/api/filesystem`.

### Data Model (SQLite + Prisma)

- **User** — email, hashed password, has many projects
- **Project** — name, messages (JSON), data (serialized VirtualFileSystem), optional userId (supports anonymous use)

### Auth

JWT-based via `jose`. Session stored in `auth-token` HTTP-only cookie. Passwords hashed with bcrypt. Auth is optional — the app works anonymously.

### Preview Rendering

Files are transformed via `@babel/standalone` in the browser. An import map maps `react`/`react-dom` to esm.sh CDN URLs and project files to blob URLs. The result runs in a sandboxed iFrame with Tailwind CSS loaded via CDN.

## Tech Stack

- **Next.js 15** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (configured via PostCSS, no tailwind.config file)
- **Radix UI** for component primitives
- **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`) for streaming + tool use
- **Prisma** with SQLite
- **Monaco Editor** for code editing
- **Vitest** + React Testing Library for tests

## Environment Variables

- `ANTHROPIC_API_KEY` — Optional. Without it, the app uses a mock provider with static responses.
- `JWT_SECRET` — Optional. Defaults to `"development-secret-key"` in dev.
