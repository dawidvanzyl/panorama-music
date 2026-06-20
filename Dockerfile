# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build .NET API ───────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build

WORKDIR /app

COPY src/ ./src/

RUN dotnet publish src/PanoramaMusic.Api/PanoramaMusic.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-self-contained \
    /p:UseSharedCompilation=false \
    -m:1

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends libkrb5-3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=api-build /app/publish ./
COPY --from=frontend-build /app/frontend/dist ./wwwroot

# Render expects services to listen on port 10000 by default and uses the
# EXPOSE directive to determine which port to health-check.  When running
# locally via Docker Compose the api service overrides this at runtime with
# ASPNETCORE_URLS: http://+:3000, so local QA is unaffected.
ENV ASPNETCORE_HTTP_PORTS=10000

EXPOSE 10000

ENTRYPOINT ["dotnet", "PanoramaMusic.Api.dll"]
