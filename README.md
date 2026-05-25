# Panorama Music

A self-hosted music streaming application built with C# (ASP.NET Core Minimal API) and Vite + Web Components.

## Tech Stack

- **Backend:** .NET 10, ASP.NET Core Minimal API
- **Backend (planned):** Dapper, DbUp, PostgreSQL
- **Frontend:** Vite, Web Components, TypeScript, ESLint, Prettier
- **Testing (planned):** xUnit
- **Infrastructure (planned):** Docker Compose

## Getting Started

```bash
# Build the backend
dotnet build src/PanoramaMusic.sln

# Run the API
dotnet run --project src/PanoramaMusic.Api
```

The API will start on `https://localhost:5001` (or the port shown in the console).

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check — returns `200 OK` |

### Swagger UI

Swagger UI is available in the **Development** environment at:

```
https://localhost:5001/swagger
```

## Project Structure

```
src/
├── PanoramaMusic.Api/            # ASP.NET Core Minimal API (entry point)
│   └── Routes/                   # Route registration extensions
├── PanoramaMusic.Application/    # Application layer (use cases)
│   └── Common/                   # Shared application abstractions
├── PanoramaMusic.Domain/         # Domain layer (entities, value objects)
│   └── Common/                   # Shared domain primitives
└── PanoramaMusic.Infrastructure/ # Infrastructure layer (data access, external services)
    └── Common/                   # Shared infrastructure utilities
```
