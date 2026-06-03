# Backend Coding Standards

C#, ASP.NET Core, Dapper, DbUp, and xUnit conventions for the Panorama Music project.

> For shared Git/PR conventions see [coding-standards.md](coding-standards.md).
> For frontend conventions see [coding-standards-frontend.md](coding-standards-frontend.md).

---

## Table of Contents

1. [C# General Conventions](#1-c-general-conventions)
2. [Layer Conventions](#2-layer-conventions)
3. [Data Access Patterns](#3-data-access-patterns)
4. [DbUp Migration Conventions](#4-dbup-migration-conventions)
5. [xUnit Test Conventions](#5-xunit-test-conventions)

---

## 1. C# General Conventions

### File and Namespace Naming

- One top-level type per file; file name matches the type name exactly.
- Use `PascalCase` for namespaces, classes, methods, properties, and public fields.
- Use `camelCase` for local variables and method parameters.

### Folder Conventions

Source files are organised into folders named after their role or type suffix:

```
Handlers/     — handler classes
Commands/     — command records
Requests/     — request/input DTOs
Models/       — output/result DTOs
Factories/    — factory classes
Repositories/ — repository classes
Services/     — service implementations
Adapters/     — adapter/wrapper classes
Entities/     — entity records (Domain) or dto classes (Infrastructure)
Dtos/         — dto classes (Infrastructure)
ValueObjects/ — value object records
Enums/        — enum types
Exceptions/   — exception classes
Interfaces/   — interface types
```

- Do not use a `Common/` catch-all folder. Every type of artifact has its own named folder.
- **Interface special case:** When interfaces are defined in a separate layer from their implementations (e.g. Domain defines `IUserRepository`, Infrastructure implements it), they live in an `Interfaces/` folder in each layer. When an interface and its implementation reside in the same layer, keep the interface in the same folder as the implementation rather than separating them.

### General Rules

- Enable nullable reference types (`<Nullable>enable</Nullable>`) in every project.
- Use expression-bodied members for trivial one-liners.
- Do not use `regions`.
- Do not suppress warnings with `#pragma` unless accompanied by a justification comment.

### Constructor Formatting

When a constructor delegates to a base constructor, `: base(...)` goes on its own
indented line. The body `{ }` sits on the line below:

```csharp
public sealed class DomainException : Exception
{
    public DomainException(string message)
        : base(message)
    { }
}
```

---

## 2. Layer Conventions

The solution is split into four projects. Each layer has a clearly defined responsibility.

### 2.1 Domain (`PanoramaMusic.Domain`)

**Purpose:** Core business entities and value objects. No dependencies on infrastructure or frameworks.

- Contains: entities, value objects, domain exceptions, interfaces (e.g. `IRepository`).
- Must not reference any NuGet package except for primitive helpers (e.g. `CSharpFunctionalExtensions`).
- No data-access code, no HTTP concepts.

**Folder layout — never use a `Common/` catch-all. Each type of artifact has its own named folder:**

```
PanoramaMusic.{Context}.Domain/
  Entities/      → PanoramaMusic.{Context}.Domain.Entities
  ValueObjects/  → PanoramaMusic.{Context}.Domain.ValueObjects
  Enums/         → PanoramaMusic.{Context}.Domain.Enums
  Interfaces/    → PanoramaMusic.{Context}.Domain.Interfaces
  Exceptions/    → PanoramaMusic.{Context}.Domain.Exceptions
```

**Example (Identity bounded context):**
```
src/Identity/PanoramaMusic.Identity.Domain/
  Entities/
    User.cs
    UserRole.cs
    RefreshToken.cs
    InviteToken.cs
  ValueObjects/
    Email.cs
    PasswordHash.cs
  Enums/
    Role.cs
  Interfaces/
    IUserRepository.cs
    IPasswordHasher.cs
    IJwtService.cs
  Exceptions/
    DomainException.cs
```

**Entity pattern — `record` with primary constructor:**

Invariant fields belong in the primary constructor. Mutable state that is changed
through domain methods uses `private set`. Mutation methods are expression-bodied
for single-liners, or full-bodied with guard clauses for multi-step logic:

```csharp
public record User(Guid UserId, Email Email, DateTime CreatedAt)
{
    public PasswordHash? PasswordHash { get; private set; }
    public bool IsActive { get; private set; }

    public void SetPassword(PasswordHash hash) => PasswordHash = hash;
    public void Activate() => IsActive = true;
}
```

**Value object pattern — `record` with private constructor and static `Create()` factory:**

Use a private constructor and a static `Create()` factory whenever the value
object has non-trivial validation invariants. The factory throws `DomainException`
for invalid input. The `Value` property is read-only:

```csharp
public record Email
{
    public string Value { get; }

    private Email(string value) => Value = value;

    public static Email Create(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) throw new DomainException("Email cannot be empty.");

        var trimmed = email.Trim();

        if (!trimmed.Contains('@')) throw new DomainException("Email must contain '@'.");

        return new Email(trimmed.ToLowerInvariant());
    }

    public override string ToString() => Value;
}
```

### 2.2 Application (`PanoramaMusic.Application`)

**Purpose:** Use-case orchestration. Depends on Domain; defines application-level interfaces implemented by Infrastructure.

- Contains: use-case handlers, DTOs, application service interfaces, validation.
- References Domain only (no Infrastructure, no ASP.NET).
- Use a flat handler pattern — one class per use case:
  ```
  src/PanoramaMusic.Application/
    Songs/
      GetSongsHandler.cs
      GetSongsQuery.cs
      SongDto.cs
  ```

**Handler input convention:** Each handler accepts a `sealed record` Command that wraps a Request. The Request holds the raw input data; the Command is the handler's parameter type. Commands with no input beyond what the Request provides are simple wrappers:

```csharp
public sealed record LoginRequest(string Email, string Password);
public sealed record LoginCommand(LoginRequest Request);
```

Handlers with simple input that does not warrant a separate Request may embed the data directly in the Command.

### 2.3 Infrastructure (`PanoramaMusic.Infrastructure`)

**Purpose:** Implements application interfaces; owns all external I/O (database, file system, third-party APIs).

- Contains: Dapper repositories, DbUp migrations, seed scripts, DI extension methods.
- Folder layout:
  ```
  src/PanoramaMusic.Infrastructure/
    Extensions/
      ServiceCollectionExtensions.cs   ← AddInfrastructure(...)
    Persistence/
      Migrations/
        V001__baseline.sql
        V002__create_schemas.sql
      Functions/
        V001__get_songs.sql
      Seeds/
        V001__baseline_seed.sql
      DatabaseMigrator.cs
    Repositories/
      SongRepository.cs
  ```
- Register all services through `ServiceCollectionExtensions.AddInfrastructure(...)`.

### 2.4 Api (`PanoramaMusic.Api`)

**Purpose:** ASP.NET Core host; maps HTTP routes to application handlers.

- Contains: `Program.cs`, route extension classes, middleware configuration.
- Route classes use the `Map{Resource}Routes` extension-method pattern:
  ```csharp
  // Routes/SongRoutes.cs
  namespace PanoramaMusic.Api.Routes;

  public static class SongRoutes
  {
      public static void MapSongRoutes(this WebApplication app)
      {
          app.MapGet("/api/songs", ...);
      }
  }
  ```
- No business logic in route handlers — delegate to Application layer.
- Return `Results.*` helpers; annotate with `.Produces(...)` for OpenAPI documentation.

---

## 3. Data Access Patterns

The project uses **Dapper** over `NpgsqlConnection`. There is no Entity Framework Core.

### 3.1 No Inline SQL

Inline SQL is **prohibited** in repository classes. Every data access operation must go through a PL/pgSQL function in the `funcs` schema. Repository classes are responsible only for calling those functions and mapping results.

### 3.2 PL/pgSQL Function Conventions

All functions live in the `funcs` schema, which is created via a baseline migration before any function scripts run.

**Naming**
- `snake_case`, verb-first: `get_songs`, `create_song`, `delete_song_by_id`.
- Always qualify with the schema: `funcs.get_songs`.

**Parameters**
- Named, `snake_case`, prefixed with `p_` to avoid column name collisions:
  `p_song_id`, `p_title`, `p_artist`.

**Return types**
- Multi-row result: `RETURNS TABLE(id uuid, title text, artist text)`
- Single scalar: `RETURNS uuid`, `RETURNS int`, etc.
- Command with no result: `RETURNS void`

**Definition template**
```sql
CREATE OR REPLACE FUNCTION funcs.get_songs()
RETURNS TABLE(id uuid, title text, artist text)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.title, s.artist
    FROM tables.songs s
    ORDER BY s.title;
END;
$$;
```

**Signature changes**
- Use `CREATE OR REPLACE FUNCTION` for all function scripts.
- If a parameter signature changes incompatibly (e.g. parameter type or count), the script must explicitly `DROP FUNCTION funcs.<name>(...) CASCADE` before recreating.

### 3.3 Calling Functions via Dapper

Always pass `commandType: CommandType.StoredProcedure`. The function name must include the schema: `funcs.function_name`. Parameters are passed as anonymous objects matching the `p_` parameter names.

**Dependency injection** — connections are registered as transient and injected into repositories:

```csharp
// Infrastructure/Extensions/ServiceCollectionExtensions.cs
services.AddTransient<NpgsqlConnection>(_ => new NpgsqlConnection(connectionString));
```

**Query (multi-row)**
```csharp
// Infrastructure/Repositories/SongRepository.cs
namespace PanoramaMusic.Infrastructure.Repositories;

public class SongRepository(NpgsqlConnection connection) : ISongRepository
{
    public async Task<IEnumerable<Song>> GetAllAsync(CancellationToken ct = default)
        {
            return await connection.QueryAsync<Song>(
                "funcs.get_songs",
                commandType: CommandType.StoredProcedure);
        }
}
```

**Command (no result)**
```csharp
public async Task DeleteAsync(Guid id, CancellationToken ct = default)
{
    await connection.ExecuteAsync(
        "funcs.delete_song_by_id",
        new { p_song_id = id },
        commandType: CommandType.StoredProcedure);
}
```

Rules:
- Use `QueryAsync` / `ExecuteAsync` — no synchronous Dapper methods.
- Never pass raw SQL strings — always use the `funcs.<function_name>` identifier.

### 3.4 Transactions

Open the connection explicitly, then pass the transaction to every Dapper call:

```csharp
await connection.OpenAsync(ct);
await using var tx = await connection.BeginTransactionAsync(ct);
try
{
    await connection.ExecuteAsync(
        "funcs.create_song",
        new { p_title = title, p_artist = artist },
        transaction: tx,
        commandType: CommandType.StoredProcedure);

    await tx.CommitAsync(ct);
}
catch
{
    await tx.RollbackAsync(ct);
    throw;
}
```

### 3.5 Repository Mapping Conventions

#### 3.5.1 Dto Classes

Dapper maps query results to simple `record` types in `Infrastructure/Dtos/`, not to domain entities directly. These dto classes mirror the table columns and stay in the Infrastructure layer. Repositories map from dtos to domain entities in a private `MapTo{Entity}` method:

```csharp
// Infrastructure/Dtos/UserDto.cs
public sealed record UserDto(
    Guid User_id,
    string Email,
    string Password_hash,
    bool Is_active,
    DateTime Created_at);
```

**Mapping convention — extension methods over private repository methods:** To keep repositories focused on data access and allow mapping logic to be reused and tested independently, extract mapping to `internal static` extension methods in `Infrastructure/Extensions/{Entity}DtoExtensions.cs`:

```csharp
// Infrastructure/Extensions/InviteTokenDtoExtensions.cs
internal static class InviteTokenDtoExtensions
{
    internal static InviteToken MapToInviteToken(this InviteTokenDto dto)
    {
        return new InviteToken(dto.Token_Id, dto.User_Id, dto.Token_Hash, dto.Expires_At);
    }
}
```

Repositories then call `dto.MapToInviteToken()` directly:
```csharp
var token = dto.MapToInviteToken();
```

#### 3.5.2 Compound Transaction Methods

When an operation must atomically update multiple entities (e.g. revoke a refresh token and create a new one), expose a dedicated repository method that owns the transaction rather than orchestrating connections and transactions in the handler layer:

```csharp
public async Task RotateAsync(Guid oldTokenId, RefreshToken newToken, CancellationToken ct = default)
{
    using var connection = _connectionFactory.CreateConnection();
    var dbConnection = (DbConnection)connection;
    await dbConnection.OpenAsync(ct);
    await using var tx = await dbConnection.BeginTransactionAsync(ct);
    try
    {
        await connection.ExecuteAsync(
            "identity.revoke_refresh_token",
            new { p_token_id = oldTokenId },
            transaction: tx,
            commandType: CommandType.StoredProcedure);

        await connection.ExecuteAsync(
            "identity.create_refresh_token",
            new { p_token_id = newToken.TokenId, p_user_id = newToken.UserId, p_token_hash = newToken.TokenHash },
            transaction: tx,
            commandType: CommandType.StoredProcedure);

        await tx.CommitAsync(ct);
    }
    catch
    {
        await tx.RollbackAsync(ct);
        throw;
    }
}
```

The handler calls this single method instead of managing the transaction itself.

---

## 4. DbUp Migration Conventions

Scripts live under `src/PanoramaMusic.Infrastructure/Persistence/` and are embedded resources. The folder structure separates concerns into three sub-folders:

```
src/PanoramaMusic.Infrastructure/Persistence/
  Migrations/    ← schema changes (tables, indexes, constraints)
  Functions/     ← PL/pgSQL function definitions (funcs schema)
  Seeds/         ← seed data
```

Each sub-folder is scanned independently by `DatabaseMigrator`.

### 4.1 File Naming

All three sub-folders use the same convention:

```
V{###}__{snake_case_description}.sql
```

- `{###}` — zero-padded three-digit sequence number, e.g. `001`, `002`, `042`.
- Double underscore (`__`) separates the version from the description.
- Description is `snake_case`, all lowercase, concise.
- Sequences are **independent per folder** — `Migrations/V001__...` and `Functions/V001__...` do not conflict.

**Examples:**
```
Migrations/
  V001__baseline.sql
  V002__add_songs_table.sql

Functions/
  V001__get_songs.sql
  V002__create_song.sql

Seeds/
  S001__baseline_seed.sql
```

### 4.2 Migration Rules

- Migrations are **irreversible** — never modify an already-applied script.
- Each migration must be idempotent where possible (use `IF NOT EXISTS`, `IF EXISTS`).
- The journal table is `public.__schema_versions`.

### 4.3 Schema Bootstrap

The `tables` and `funcs` schemas must exist before any table or function scripts run. Create them in a schema migration:

```sql
-- Migrations/V002__create_schemas.sql
CREATE SCHEMA IF NOT EXISTS tables;
CREATE SCHEMA IF NOT EXISTS funcs;
```

### 4.4 Function Script Rules

- Always use `CREATE OR REPLACE FUNCTION funcs.<name>`.
- If a parameter signature changes incompatibly, the script must `DROP FUNCTION funcs.<name>(...) CASCADE` before recreating.
- Function scripts are **not** idempotent by default — `CREATE OR REPLACE` handles re-runs unless a drop is required.

### 4.5 DatabaseMigrator

The `DatabaseMigrator` must run three separate scans — one per folder — each targeting its own journal table so sequences remain independent:

```csharp
// Migrations scan
DeployChanges.To
    .PostgresqlDatabase(connectionString)
    .WithScriptsEmbeddedInAssembly(
        typeof(DatabaseMigrator).Assembly,
        name => name.Contains(".Migrations."))
    .JournalToPostgresqlTable("public", "__schema_versions")
    .Build();

// Functions scan
DeployChanges.To
    .PostgresqlDatabase(connectionString)
    .WithScriptsEmbeddedInAssembly(
        typeof(DatabaseMigrator).Assembly,
        name => name.Contains(".Functions."))
    .JournalToPostgresqlTable("public", "__function_versions")
    .Build();

// Seeds scan
DeployChanges.To
    .PostgresqlDatabase(connectionString)
    .WithScriptsEmbeddedInAssembly(
        typeof(DatabaseMigrator).Assembly,
        name => name.Contains(".Seeds."))
    .JournalToPostgresqlTable("public", "__seed_versions")
    .Build();
```

Run scans in order: **Migrations → Functions → Seeds**.

### 4.6 Embedding

```xml
<ItemGroup>
  <EmbeddedResource Include="Persistence\Migrations\*.sql" />
  <EmbeddedResource Include="Persistence\Functions\*.sql" />
  <EmbeddedResource Include="Persistence\Seeds\*.sql" />
</ItemGroup>
```

---

## 5. xUnit Test Conventions

### 5.1 Project Structure

Tests live in `src/PanoramaMusic.Tests/`.

Mirror the production namespace under the test project:

```
src/PanoramaMusic.Tests/
  Domain/
    SongTitleTests.cs
  Application/
    Songs/
      GetSongsHandlerTests.cs
  SmokeTests.cs
```

### 5.2 Test Naming

Test method names follow the pattern:

```
{MethodOrScenario}_{Condition}_{ExpectedOutcome}
```

**Examples:**
```csharp
GetAll_WhenTableIsEmpty_ReturnsEmptyCollection()
Create_WhenTitleIsBlank_ThrowsDomainException()
TestRunner_ShouldBeConfiguredCorrectly()   // smoke test — plain description is acceptable
```

### 5.3 Test Structure (Arrange / Act / Assert)

```csharp
[Fact]
public void Create_WhenTitleIsBlank_ThrowsDomainException()
{
    // Arrange
    var blankTitle = string.Empty;

    // Act
    Action act = () => new Song(blankTitle, "Artist");

    // Assert
    act.ShouldThrow<DomainException>();
}
```

- Use the `Shouldly` assertion library (already referenced in the test project).
- One logical assertion per test where practical.
- Use `[Theory]` + `[InlineData]` for data-driven tests.
- Do not use `[Collection]` unless tests genuinely share expensive state.
