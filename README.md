# test5

Notes app monorepo scaffold.

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
cp .env.example .env
npm install
npm install --prefix client
```

## Scripts

| Script                 | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start the server in watch mode       |
| `npm run dev:client`   | Start the Vite frontend dev server   |
| `npm run build`        | Compile server and client            |
| `npm run build:server` | Compile server TypeScript to `dist/` |
| `npm start`            | Run the compiled server              |
| `npm run lint`         | Run ESLint                           |
| `npm run format`       | Format files with Prettier           |
| `npm run format:check` | Check formatting without writing     |
| `npm run typecheck`    | Type-check without emitting files    |
| `npm test`             | Run Vitest tests                     |
| `npm run db:generate`  | Generate SQL migrations from schema  |
| `npm run db:migrate`   | Apply migrations to the database     |

## Frontend

The React client lives in `client/` and uses Vite with React Router.

```bash
npm run dev:client
```

Routes are scaffolded for notes, archived notes, organize, login, and a new-note placeholder. API proxying to the backend is configured in `client/vite.config.ts`.

## Backend API

The Express app is created via `createApp()` in `src/app.ts` with injectable dependencies for testing.

- `src/api/router.ts` — mounts API route modules
- `src/auth/` — JWT helpers and `requireAuth` middleware
- `src/services/` — shared service context and `BaseService` for domain logic

```bash
npm run dev
curl http://localhost:3000/health
```

## Database

The schema is defined in `src/db/schema.ts` using Drizzle ORM. Tables cover users, sessions, folders, notes (with offline sync and voice-capture fields), tags, note shares, and note versions for conflict preservation.

```bash
npm run db:generate
npm run db:migrate
```

Set `TEST_DATABASE_URL` (or `DATABASE_URL`) to a PostgreSQL instance before running schema tests locally.

## Environment

Copy `.env.example` and adjust values for your target environment:

- **development** — local defaults, no secrets required
- **staging** — set `NODE_ENV=staging` and staging database credentials
- **production** — set `NODE_ENV=production`, `DATABASE_URL`, and `SESSION_SECRET`

## CI

GitHub Actions runs lint, format check, typecheck, build, and tests on every push and pull request to `main`.
