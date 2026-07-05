# Basecamp PM

A project management app that starts with a plan, not a blank page. Pick a
project type and get a pre-populated work breakdown structure, then run the
work your way — Kanban board, WBS/list view, or Gantt timeline — all backed by
the same data, so a change in one view shows up everywhere else.

![Landing page](docs/screenshots/landing.png)

## Screenshots

| Kanban board | WBS / list view |
|---|---|
| ![Kanban board](docs/screenshots/board.png) | ![WBS table](docs/screenshots/wbs.png) |

| Timeline with dependency arrows | Project wizard (dark mode) |
|---|---|
| ![Timeline](docs/screenshots/timeline.png) | ![Wizard](docs/screenshots/wizard-dark.png) |

## Features

**Planning**
- **Project-type wizard** — Software, Home, Auto, Event, or Custom, each with
  a starter set of phases, milestones, and tasks
- **AI-assisted kickoff** — describe the project in a sentence and let Claude
  draft (or refine) the phase/task tree
- **Work breakdown structure (WBS)** — hierarchical, inline-editable task
  list with phases, owners, dates, and percent complete

**Execution**
- **Kanban board** — drag and drop between Backlog / In Progress / Review /
  Done; status changes are reflected instantly in every other view
- **Gantt timeline** — planned vs. actual bars per task, colored by whether
  work is on track, behind schedule, or done late; a red connector line
  flags a real scheduling conflict when a dependency isn't respected
- **Task dependencies** — mark a task as depending on another; the app
  rejects circular dependencies and flags blocked tasks on the board and WBS
- **Issue log** and a **reporting dashboard** (on-track vs. behind schedule,
  grouped by owner)

**Collaboration & data**
- **Multi-user projects** with roles (Owner / Editor / Viewer)
- **CSV / JSON export & import** — take the plan offline and bring changes
  back, matched by WBS code so edits merge instead of duplicating
- **Complete → reuse as template** — turn a finished project into a starter
  template for the next similar one, capturing lessons learned
- **Light / dark theme**, persisted per browser

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 +
PostgreSQL · NextAuth (Auth.js) v5 · dnd-kit · lucide-react · Anthropic Claude
API · Vitest

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

## Roadmap

**Shipped**
- [x] Project-type wizard with starter templates + AI-assisted kickoff
- [x] Kanban board, WBS, and Gantt timeline views over shared task data
- [x] Task dependencies with cycle detection and blocked-task indicators
- [x] Issue log and reporting dashboard
- [x] CSV / JSON export and import
- [x] Multi-user projects with roles
- [x] Complete → reuse as template
- [x] Dark mode
- [x] Automated test suite (Vitest) and Docker deployment

**Planned**
- [ ] **Proper team invites** — invite by email without requiring the
      invitee to already have an account (pending invite → accept → join)
- [ ] **Notifications / activity feed** — who changed what, tasks assigned
      to you
- [ ] **Production hardening** — rate limiting on auth endpoints, structured
      logging, broader test coverage on the route handlers
- [ ] **Mobile app** — see below; direction is still being decided

### Mobile app — under evaluation

The web app is usable on a phone browser today, but the dense views (WBS
table, Gantt timeline) aren't built mobile-first. Options being weighed,
roughly in order of effort:

1. **PWA** (installable web app, offline-friendly shell) — reuses 100% of
   the existing code and backend; mainly UI work to add mobile-optimized
   layouts for the board/task list plus a manifest and service worker.
2. **React Native / Expo app** — native UX and push notifications, talking
   to the same API routes, but a separate codebase and UI built from
   scratch for phone-sized screens.
3. **Capacitor/Ionic wrapper** — native app shell around the existing web
   UI; less native-feeling than option 2, less work than a full rewrite.

No implementation has started yet — this section will be updated once a
direction is chosen.

## License

MIT — see [LICENSE](./LICENSE).
