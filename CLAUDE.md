# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # First-time setup: install deps, generate Prisma client, run migrations
npm run dev          # Start dev server with Turbopack at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run all tests (Vitest)
npx vitest run src/path/to/file.test.ts  # Run a single test file
npm run db:reset     # Reset and re-migrate the SQLite database
```

Set `ANTHROPIC_API_KEY` in `.env` to use the real Claude API. Without it, the app uses a built-in mock provider that returns static component code.

## Architecture

### AI Generation Pipeline

The core loop: user message → `POST /api/chat` → Vercel AI SDK `streamText` → Claude calls tools → tool results update a `VirtualFileSystem` → serialized VFS returned in stream → client applies tool calls to its own VFS copy → preview re-renders.

Two AI tools are exposed to Claude:
- **`str_replace_editor`** (`src/lib/tools/str-replace.ts`): creates files and performs targeted string replacements (like a text editor)
- **`file_manager`** (`src/lib/tools/file-manager.ts`): renames and deletes files

The model used is `claude-haiku-4-5` (configured in `src/lib/provider.ts`). When no API key is present, `MockLanguageModel` in the same file handles requests with hardcoded static responses.

### Virtual File System

`VirtualFileSystem` (`src/lib/file-system.ts`) is a pure in-memory tree of files — nothing is written to disk. It serializes to/from JSON for:
- Sending the current file state with each chat API request (so Claude sees existing files)
- Persisting project data in SQLite via Prisma (`Project.data` column stores serialized VFS JSON)

`FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) holds the client-side VFS state and exposes `handleToolCall` — the bridge that applies incoming AI tool calls to the local VFS and triggers React re-renders via a `refreshTrigger` counter.

### Live Preview

`PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) renders an `<iframe srcdoc>` that re-builds on every `refreshTrigger` change. The pipeline:
1. `createImportMap` (`src/lib/transform/jsx-transformer.ts`) iterates all VFS files, compiles each `.jsx/.tsx` file with **Babel Standalone** in the browser, and creates `blob:` URLs
2. An HTML import map is built mapping bare specifiers and `@/` aliases to those blob URLs; third-party packages are resolved via `https://esm.sh/`
3. `createPreviewHTML` generates the full HTML document with the import map, embedded styles, and a React 19 bootstrap script
4. The iframe loads `/App.jsx` (or first found `.jsx/.tsx` as fallback) as the entry point
5. Tailwind CSS is loaded from CDN (`cdn.tailwindcss.com`) inside the iframe

### Chat Context

`ChatContext` (`src/lib/contexts/chat-context.tsx`) wraps Vercel AI SDK's `useChat` hook. It sends `files` (serialized VFS) and `projectId` with every request. The `onToolCall` callback routes incoming tool calls to `FileSystemContext.handleToolCall`.

### Auth & Persistence

- JWT-based sessions stored in an httpOnly cookie (`auth-token`), 7-day expiry, signed with `JWT_SECRET` env var
- `src/lib/auth.ts` is `server-only` — never imported on the client
- Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem` routes
- Prisma client is generated to `src/generated/prisma/` (not the default location); SQLite DB at `prisma/dev.db`
- Anonymous users can work without logging in; `anon-work-tracker.ts` stores session state in `localStorage` so it can be claimed after sign-up

### Project Route

`src/app/[projectId]/page.tsx` loads a saved project from the DB (messages + VFS data) and passes them as `initialMessages` and `initialData` to the providers, resuming the session.

## Conventions

- Use comments sparingly — only comment complex or non-obvious code
- Reference `prisma/schema.prisma` for database structure when working with data models or queries

## Testing

Tests use Vitest + jsdom + Testing Library. Test files live in `__tests__/` subdirectories next to the code they test. The Vitest config is at `vitest.config.mts`.
