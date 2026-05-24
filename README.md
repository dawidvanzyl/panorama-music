# Panorama Music

A self-hosted music streaming application built with C# (ASP.NET Core Minimal API) and Vite + Web Components.

## Repository Structure

```
panorama-music/
├── frontend/                        ← Vite + Web Components
├── src/                             ← C# solution
│   ├── PanoramaMusic.sln
│   ├── PanoramaMusic.Api/           ← ASP.NET Core Minimal API
│   ├── PanoramaMusic.Application/   ← Use cases, DTOs, service interfaces
│   ├── PanoramaMusic.Domain/        ← Entities, value objects, repository interfaces
│   └── PanoramaMusic.Infrastructure/← Dapper repositories, Argon2, JWT service
├── docs/
└── .github/
```

## Tech Stack

- **Backend:** .NET 10, ASP.NET Core Minimal API, Dapper, DbUp, PostgreSQL
- **Frontend:** Vite, Web Components, TypeScript
- **Testing:** xUnit
- **Infrastructure:** Docker Compose

## Getting Started

```bash
# Build the backend
dotnet build src/PanoramaMusic.sln
```
