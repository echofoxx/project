# Project

A project management app that starts with a plan, not a blank page. Pick a
project type and get a pre-populated work breakdown structure, then run the
work your way — Kanban board, WBS/list view, or reports — all backed by the
same data, so a change in one view shows up everywhere else.

## Features

- **Project-type wizard** — Software, Home, Auto, Event, or Custom, each with
  a starter set of phases, milestones, and tasks
- **AI-assisted kickoff** — describe the project in a sentence and let Claude
  draft (or refine) the phase/task tree
- **Kanban board** — drag and drop between Backlog / In Progress / Review / Done
- **WBS / list view** — hierarchical, inline-editable, same task data as the board
- **Issue log** and a **reporting dashboard** (on-track vs. behind schedule, by owner)
- **CSV / JSON export & import** — take the plan offline and bring changes back
- **Multi-user projects** with roles (Owner / Editor / Viewer)
- **Complete → reuse as template** — turn a finished project into a starter
  template for the next similar one

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 +
PostgreSQL · NextAuth (Auth.js) v5 · dnd-kit · Anthropic Claude API

## Running with Docker (recommended)

Requires [Docker](https://docs.docker.com/get-docker/) and the Compose plugin.

1. Copy the example environment file and fill in the required values:

   ```bash
   cp .env.example .env
   ```

   At minimum, set `AUTH_SECRET` (generate one with `openssl rand -base64 32`).
   `ANTHROPIC_API_KEY` is optional — without it, everything works except the
   "Draft with AI" step in the project wizard.

2. Build and start the app and its Postgres database:

   ```bash
   docker compose up --build
   ```

   On first start, the app container automatically runs database migrations
   and seeds the four built-in starter templates before the server starts.

3. Open <http://localhost:3000>, sign up, and create your first project.

To stop everything: `docker compose down` (add `-v` to also delete the
database volume and start fresh next time).

### Configuration

All configuration is via environment variables, set in `.env` (see
`.env.example` for the full list):

| Variable | Required | Purpose |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | No (defaults provided) | Credentials for the Postgres container |
| `AUTH_SECRET` | **Yes** | Session encryption key for NextAuth |
| `ANTHROPIC_API_KEY` | No | Enables the AI-assisted project kickoff |
| `APP_PORT` | No (defaults to 3000) | Host port the app is exposed on |

If you put the app behind a reverse proxy on a different host/port than
`localhost:3000`, no extra configuration is needed — `docker-compose.yml`
already sets `AUTH_TRUST_HOST=true`, which is required for NextAuth to accept
requests in a self-hosted (non-Vercel) production deployment.

## Running locally without Docker

Requires Node.js 22+ and a running PostgreSQL instance.

```bash
npm install
cp .env.example .env   # set DATABASE_URL, AUTH_SECRET, etc.
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

The app is then available at <http://localhost:3000>.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Start the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the automated test suite (Vitest) |
| `npm run db:migrate` | Apply Prisma migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Seed the built-in starter templates |

## License

MIT — see [LICENSE](./LICENSE).
