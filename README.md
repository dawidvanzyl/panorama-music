# Panorama Music

[![CI](https://github.com/dawidvanzyl/panorama-music/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/dawidvanzyl/panorama-music/actions/workflows/ci.yml)

A self-hosted music streaming application built with C# (ASP.NET Core Minimal API) and Vite + Web Components.

## Tech Stack

- **Backend:** .NET 10, ASP.NET Core Minimal API, Dapper, Npgsql, DbUp
- **Database:** PostgreSQL
- **Frontend:** Vite, Web Components, TypeScript, ESLint, Prettier
- **Testing:** xUnit (backend unit), Vitest (frontend unit), Playwright (E2E)
- **Infrastructure:** Docker Compose, GitHub Actions

## CI

The CI workflow runs on every push and pull request to `master`.

| Job | Steps |
|-----|-------|
| `backend-ci` | `dotnet restore` → `dotnet build` → `dotnet test` → `dotnet format --verify-no-changes` |
| `frontend-ci` | `npm ci` → `npm run lint` → `npm run typecheck` (`tsc --noEmit`) → `npx vite build` |
| `e2e-ci` | Brings up the `qa` Compose profile with `RESET_DB=true`, waits for `/api/health`, then runs `npx playwright test` |

All jobs run in parallel. Formatting, lint, or E2E spec failures will block the workflow. The `e2e-ci` job supplies the `qa` stack's JWT/admin/Postgres credentials as inline CI-only placeholder values — the stack is ephemeral, local to the job, and never exposed, so no GitHub Secrets are needed.

## Getting Started

### Prerequisites

- .NET 10 SDK
- PostgreSQL instance (local or via Docker)
- Docker and Docker Compose (for Docker-based workflows)

### Configuration

The API reads the database connection string from `ConnectionStrings:DefaultConnection`.

For local development, `appsettings.Development.json` is pre-configured for a Docker PostgreSQL instance:

```
Host=localhost;Port=5432;Database=panorama_music_dev;Username=postgres;Password=postgres
```

In production, set the environment variable:

```
ConnectionStrings__DefaultConnection=<your-connection-string>
```

### Running the API

```bash
# Build the backend
dotnet build src/PanoramaMusic.sln

# Run the API (requires PostgreSQL to be available)
dotnet run --project src/PanoramaMusic.Api
```

The API will start on `https://localhost:7162` / `http://localhost:5102` (or the port shown in the console).

On startup, DbUp runs any pending migrations automatically.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check — returns `200 OK` |

### OpenAPI

The OpenAPI document is available in the **Development** environment at:

```
https://localhost:7162/openapi/v1.json
```

## Docker Compose

Two profiles are available: `dev` (database only) and `qa` (full stack).

### Setup

Copy `.env.example` to `.env` and adjust values as needed:

```bash
cp .env.example .env
```

### Dev profile — PostgreSQL only

Starts a PostgreSQL container on port `5432`. Use this for local development alongside `dotnet run`.

```bash
docker compose --profile dev up -d
```

### QA profile — full stack

Builds the API (with embedded frontend) and starts PostgreSQL + the API container. The application is served at `http://localhost:3000`.

```bash
docker compose --profile qa up --build
```

Verify the stack is healthy:

```bash
curl http://localhost:3000/api/health
# → 200 OK
```

> The backend serves the Vite-built frontend as static files via `UseStaticFiles()`. No separate frontend container or nginx is required.

### QA database reset and seed

To start a feature test against a clean database, set `RESET_DB=true` before bringing the stack up. On boot the API will:

1. Drop and recreate the `public`, `identity`, `tables`, and `funcs` schemas (all tables and data across every bounded context are wiped)
2. Re-run all DbUp migrations from scratch
3. Execute all seed scripts from `Persistence/Seeds/` in filename order

```bash
# One-shot clean start
RESET_DB=true docker compose --profile qa up --build

# Or via .env — set RESET_DB=true, bring the stack up, then set it back to false
```

> `RESET_DB` defaults to `false`. It is safe to leave the variable present in `.env`; only the value `true` (case-insensitive) triggers a reset.

## End-to-End Testing (Playwright)

The Playwright E2E suite is a self-contained npm project under `e2e/` (mirroring how `frontend/` owns its own `package.json`) and runs against the `qa` Docker Compose profile (`http://localhost:3000`) — the same artifact deployed to Render, with the frontend served statically by the API.

```bash
cd e2e
npm install
npx playwright install chromium
RESET_DB=true docker compose --profile qa up --build -d
npm run test:e2e
```

Specs are organised by feature under `e2e/features/` (e.g. `e2e/features/identity/auth/`), with shared fixtures in `e2e/fixtures/` and page objects in `e2e/pages/`. Every future milestone extends this same structure rather than introducing a new suite.

Specs that log in (e.g. `auth/session.spec.ts`) authenticate as the seeded admin user and read credentials from the same `Admin__Email` / `Admin__Password` environment variables used to seed them (falling back to the `.env.example` defaults if unset) — export them before `npm run test:e2e` if your `.env` overrides the defaults.

Some specs need a precondition that can't be produced through the UI/API alone (e.g. `auth/registration.spec.ts` simulating an already-expired invite token). These use `e2e/fixtures/db.ts` to connect directly to the `qa` Postgres database (`localhost:5433`), reading the same `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB_QA` environment variables the Compose stack is seeded with.

Specs that need a real outgoing email (e.g. `auth/password-reset.spec.ts`) read it back via `e2e/fixtures/mailbox.ts`, which queries the `qa` profile's `smtp4dev` REST API at `http://localhost:5000/api/Messages`. Since `smtp4dev` is a single shared mailbox for the whole run, the helper always filters by the test's own recipient address rather than assuming the latest message belongs to the current test.

Linting and formatting (ESLint + Prettier, mirroring `frontend/`'s setup):

```bash
npm run lint
npm run format
```

## Deployment

The application is deployed to [Render](https://render.com) as a Docker Web Service.

- **Production URL:** https://panorama-music.onrender.com
- **Health check:** `GET https://panorama-music.onrender.com/api/health`

> Render's free tier spins down after 15 minutes of inactivity. The first request after a period of inactivity will take longer to respond while the service restarts.

### Environment variables (Render)

| Variable | Description |
|---|---|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string (use Neon's pooled connection string) |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `JWT__Secret` | JWT signing secret (placeholder until M1) |

On startup, DbUp automatically runs all pending migrations against the Neon database.

#### Adding seed data

Add numbered SQL files to `src/PanoramaMusic.Infrastructure/Persistence/Seeds/`, following the same `S001__description.sql` convention. They are embedded in the assembly at build time and executed in alphabetical order after every reset.
