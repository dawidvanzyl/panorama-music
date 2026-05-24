# Panorama Music

A self-hosted music streaming application built with C# (ASP.NET Core Minimal API) and Vite + Web Components.

## Repository Structure

```
panorama-music/
├── frontend/                        ← Vite + Web Components (planned)
├── src/                             ← C# solution
│   ├── PanoramaMusic.sln
│   ├── PanoramaMusic.Api/           ← ASP.NET Core Minimal API
│   ├── PanoramaMusic.Application/   ← Use cases, DTOs, service interfaces (planned)
│   ├── PanoramaMusic.Domain/        ← Entities, value objects, repository interfaces (planned)
│   └── PanoramaMusic.Infrastructure/← Dapper repositories, Argon2, JWT service (planned)
├── docs/
└── .github/
```

## Tech Stack

- **Backend:** .NET 10, ASP.NET Core Minimal API
- **Backend (planned):** Dapper, DbUp, PostgreSQL
- **Frontend (planned):** Vite, Web Components, TypeScript
- **Testing (planned):** xUnit
- **Infrastructure (planned):** Docker Compose

## Getting Started

```bash
# Build the backend
dotnet build src/PanoramaMusic.sln
```
