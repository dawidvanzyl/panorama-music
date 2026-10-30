# Panorama Music

[![CI](https://github.com/dawidvanzyl/panorama-music/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/dawidvanzyl/panorama-music/actions/workflows/ci.yml)

A primary-school music department management application — tracking students, instruments, lessons, teachers, and progress — built with C# (ASP.NET Core Minimal API) and Vite + Web Components.

## Tech stack

- **Backend:** .NET 10, ASP.NET Core Minimal API, Dapper, Npgsql, DbUp
- **Database:** PostgreSQL
- **Frontend:** Vite, Web Components, TypeScript
- **Testing:** xUnit, Vitest, Playwright
- **Infrastructure:** Docker Compose, GitHub Actions

## Run it yourself

The production stack is PostgreSQL plus one API container that also serves the frontend. Put a reverse proxy in front of it for HTTPS.

```bash
cp .env.prod.example .env.prod
# Fill in every value marked REQUIRED, then:
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Each setting is explained in [`.env.prod.example`](.env.prod.example). The API listens on `127.0.0.1:3000` and trusts one forwarded hop, so run exactly one reverse proxy in front of it.

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) — local development, CI and end-to-end tests
- [docs/hosting.md](docs/hosting.md) — how the maintainer's own instance is deployed
- [docs/](docs/) — coding, design and security standards

## License

See [LICENSE](LICENSE).
