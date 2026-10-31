# Hosting (Render)

This page records how the maintainer's own instance is deployed. It is not a self-hosting guide. For self-hosting, see the wiki.

## Deployment

The application is deployed to [Render](https://render.com) as a Docker Web Service.

- **Production URL:** https://panorama-music.onrender.com
- **Health check:** `GET https://panorama-music.onrender.com/api/health`

> Render's free tier spins down after 15 minutes of inactivity. The first request after a period of inactivity will take longer to respond while the service restarts.

The CD workflow (`.github/workflows/cd.yml`) triggers a Render deploy hook when a `milestone/*` tag is pushed.

### Environment variables (Render)

| Variable | Description |
|---|---|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string for the `panorama_app` application role (use Neon's pooled connection string) |
| `ConnectionStrings__Migrations` | Privileged PostgreSQL connection string used for startup migrations and `panorama_app` role provisioning |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ASPNETCORE_HTTP_PORTS` | `10000`, the port Render health-checks. Also set in the `Dockerfile` |
| `AppBaseUrl` | `https://panorama-music.onrender.com`. Base URL used to build invite and password-reset links |
| `Admin__Email` / `Admin__Password` | Credentials of the seeded admin account, created when no admin exists (secret) |
| `JWT__Secret` | JWT signing secret (secret) |
| `JWT__Issuer` / `JWT__Audience` | `panorama-music-api` / `panorama-music-client`. Pinned during token validation |
| `JWT__AbsoluteSessionLifetimeDays` | `30`. Absolute session lifetime cap |
| `Hibp__Enabled` | `true`. Checks new passwords against the Pwned Passwords API (the default) |
| `RateLimiting__Auth__IpPermitLimit` / `RateLimiting__Auth__AccountPermitLimit` / `RateLimiting__Auth__WindowSeconds` | `10` / `10` / `60`. Same as the `appsettings.json` defaults |
| `Serilog__MinimumLevel__Default` | `Information` |
| `Serilog__MinimumLevel__Override__Microsoft` | `Warning` |
| `Email__Provider` | `Maileroo` in Production — Render's free tier blocks outbound SMTP, so password-reset email is sent via the Maileroo HTTP API instead |
| `Email__From` / `Email__ReplyTo` / `Email__FromDisplayName` | Sender/reply-to address and display name used for outbound email regardless of transport |
| `Maileroo__ApiKey` | Maileroo API key (secret); sent as an `Authorization: Bearer` header, required when `Email__Provider=Maileroo` |
| `DataProtection__KeyProtection` | `Certificate` in Production — the Data Protection keyring persisted in PostgreSQL must be encrypted with a key held outside the database |
| `DataProtection__CertificateBase64` / `DataProtection__CertificatePassword` | Base64-encoded PFX certificate (secret) and its password (secret), used to encrypt the keyring at rest; required when `DataProtection__KeyProtection=Certificate`. The certificate is not covered by the database provider's backups and must be stored durably outside the hosting platform — losing it makes every previously protected value unrecoverable |
| `DataProtection__ApplicationName` | Stable application name used for Data Protection key isolation (`PanoramaMusic`) |

### Render-specific behaviour

On startup, DbUp automatically runs all pending migrations against the Neon database.

In Production, the seeded admin account is created with a forced credential rotation: its first successful login is denied normal access and directed into the password-reset flow instead, so the documented seed password (`Admin__Password`) cannot remain valid indefinitely if left unchanged.

Outbound email (e.g. password reset) goes through an injectable `IMailSender` transport selected by `Email__Provider`, chosen purely by configuration — no code change is required to switch transports. Production uses `Maileroo` (the Maileroo HTTP API), since Render's free tier blocks outbound SMTP on ports 25/587. Development and QA use `Smtp` against a local docker mail catcher (smtp4dev). Email content (subject, reset link, expiry copy) is built once in `EmailService` and is identical regardless of which transport sends it.

The ASP.NET Core Data Protection keyring is persisted to PostgreSQL (`PanoramaMusic.DataProtection`) rather than the container filesystem, so protected values (e.g. encrypted banking details) remain decryptable across restarts, redeploys and Render's free-tier spin-downs — a filesystem-backed keyring would be silently destroyed on every one of those. Protection-at-rest is chosen purely by `DataProtection__KeyProtection`: `None` for Development/QA, `Certificate` for Production. When `Certificate` is selected, startup fails fast with a descriptive error if the certificate or its password is missing — it never falls back to an unprotected keyring.

### Forwarded headers

The API trusts exactly one forwarded hop (`ForwardLimit = 1`, empty proxy allowlists) because Render's edge proxy is the only intermediary in front of the container. Re-derive this bound if a CDN or second proxy is ever placed in front of it. See `src/PanoramaMusic.Api/Program.cs`.
