# Panorama Music

[![CI](https://github.com/dawidvanzyl/panorama-music/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/dawidvanzyl/panorama-music/actions/workflows/ci.yml)

A self-hosted music streaming application built with C# (ASP.NET Core Minimal API) and Vite + Web Components.

## Tech Stack

- **Backend:** .NET 10, ASP.NET Core Minimal API, Dapper, Npgsql, DbUp
- **Database:** PostgreSQL
- **Frontend:** Vite, Web Components, TypeScript, ESLint, Prettier
- **Testing (planned):** xUnit
- **Infrastructure:** Docker Compose, GitHub Actions

## CI

The CI workflow runs on every push and pull request to `develop`.

| Job | Steps |
|-----|-------|
| `backend-ci` | `dotnet restore` → `dotnet build` → `dotnet test` → `dotnet format --verify-no-changes` |
| `frontend-ci` | `npm ci` → `npm run lint` → `npm run typecheck` (`tsc --noEmit`) → `npx vite build` |

Both jobs run in parallel. Formatting or lint failures will block the workflow.

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

### Swagger UI

Swagger UI is available in the **Development** environment at:

```
https://localhost:7162/swagger
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

1. Drop and recreate the `public` schema (all tables and data are wiped)
2. Re-run all DbUp migrations from scratch
3. Execute all seed scripts from `Persistence/Seeds/` in filename order

```bash
# One-shot clean start
RESET_DB=true docker compose --profile qa up --build

# Or via .env — set RESET_DB=true, bring the stack up, then set it back to false
```

> `RESET_DB` defaults to `false`. It is safe to leave the variable present in `.env`; only the value `true` (case-insensitive) triggers a reset.

#### Adding seed data

Add numbered SQL files to `src/PanoramaMusic.Infrastructure/Persistence/Seeds/`, following the same `S001__description.sql` convention. They are embedded in the assembly at build time and executed in alphabetical order after every reset.
