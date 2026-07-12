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

| Script                 | Description                       |
| ---------------------- | --------------------------------- |
| `npm run dev`          | Start the server in watch mode    |
| `npm run build`        | Compile TypeScript to `dist/`     |
| `npm start`            | Run the compiled server           |
| `npm run lint`         | Run ESLint                        |
| `npm run format`       | Format files with Prettier        |
| `npm run format:check` | Check formatting without writing  |
| `npm run typecheck`    | Type-check without emitting files |
| `npm test`             | Run Vitest smoke tests            |

## Environment

Copy `.env.example` and adjust values for your target environment:

- **development** — local defaults, no secrets required
- **staging** — set `NODE_ENV=staging` and staging database credentials
- **production** — set `NODE_ENV=production`, `DATABASE_URL`, and `SESSION_SECRET`

## CI

GitHub Actions runs lint, format check, typecheck, build, and tests on every push and pull request to `main`.
