# test5

Notes app monorepo scaffold.

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
cp .env.example .env
npm install
```

## Scripts

| Script                 | Description                         |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start the server in watch mode      |
| `npm run build`        | Compile TypeScript to `dist/`       |
| `npm start`            | Run the compiled server             |
| `npm run lint`         | Run ESLint                          |
| `npm run format`       | Format files with Prettier          |
| `npm run format:check` | Check formatting without writing    |
| `npm run typecheck`    | Type-check without emitting files   |
| `npm test`             | Run Vitest tests                    |
| `npm run db:generate`  | Generate SQL migrations from schema |
| `npm run db:migrate`   | Apply migrations to the database    |

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
