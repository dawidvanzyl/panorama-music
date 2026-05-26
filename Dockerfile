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
    --no-self-contained \
    /p:UseSharedCompilation=false \
    -m:1

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app

COPY --from=api-build /app/publish ./
COPY --from=frontend-build /app/frontend/dist ./wwwroot

# Bind to port 3000 by default so the image behaves consistently whether run
# via Compose or standalone (docker run).  ASPNETCORE_URLS in Compose overrides
# this but keeps the same value, so there is no conflict.
ENV ASPNETCORE_HTTP_PORTS=3000

EXPOSE 3000

ENTRYPOINT ["dotnet", "PanoramaMusic.Api.dll"]
