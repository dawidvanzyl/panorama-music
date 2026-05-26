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
COPY global.json ./

RUN dotnet publish src/PanoramaMusic.Api/PanoramaMusic.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-self-contained

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app

COPY --from=api-build /app/publish ./
COPY --from=frontend-build /app/frontend/dist ./wwwroot

EXPOSE 3000

ENTRYPOINT ["dotnet", "PanoramaMusic.Api.dll"]
