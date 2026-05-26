# Backend Coding Standards

C#, ASP.NET Core, Dapper, DbUp, and xUnit conventions for the Panorama Music project.

> For shared Git/PR conventions see [coding-standards.md](coding-standards.md).
> For frontend conventions see [coding-standards-frontend.md](coding-standards-frontend.md).

---

## Table of Contents

1. [C# General Conventions](#1-c-general-conventions)
2. [Layer Conventions](#2-layer-conventions)
3. [Dapper Query Patterns](#3-dapper-query-patterns)
4. [DbUp Migration Conventions](#4-dbup-migration-conventions)
5. [xUnit Test Conventions](#5-xunit-test-conventions)

---

## 1. C# General Conventions

### File and Namespace Naming

- One top-level type per file; file name matches the type name exactly.
- Namespaces mirror the folder structure relative to the project root.
  ```
  src/PanoramaMusic.Api/Routes/HealthRoutes.cs
  → namespace PanoramaMusic.Api.Routes
  ```
- Use `PascalCase` for namespaces, classes, methods, properties, and public fields.
- Use `camelCase` for local variables and method parameters.
- Prefix private instance fields with an underscore: `_connectionString`.
- Use file-scoped namespace declarations (no extra indentation level):
  ```csharp
  namespace PanoramaMusic.Api.Routes;

  public static class HealthRoutes { ... }
  ```

### General Rules

- Enable nullable reference types (`<Nullable>enable</Nullable>`) in every project.
- Prefer `var` when the type is obvious from the right-hand side.
- Use expression-bodied members for trivial one-liners.
- Do not use `regions`.
- Do not suppress warnings with `#pragma` unless accompanied by a justification comment.

---

## 2. Layer Conventions

The solution is split into four projects. Each layer has a clearly defined responsibility.

### 2.1 Domain (`PanoramaMusic.Domain`)

**Purpose:** Core business entities and value objects. No dependencies on infrastructure or frameworks.

- Contains: entities, value objects, domain exceptions, interfaces (e.g. `IRepository`).
- Must not reference any NuGet package except for primitive helpers (e.g. `CSharpFunctionalExtensions`).
- No data-access code, no HTTP concepts.

**Example:**
```
src/PanoramaMusic.Domain/
  Entities/
    Song.cs
  ValueObjects/
    SongTitle.cs
  Exceptions/
    DomainException.cs
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
      Seeds/
        S001__baseline_seed.sql
      DatabaseMigrator.cs
      DatabaseSeeder.cs
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
- Return `Results.*` helpers; annotate with `.Produces(...)` for Swagger.

---

## 3. Dapper Query Patterns

The project uses **Dapper** over raw `NpgsqlConnection`. There is no Entity Framework Core.

### 3.1 Dependency Injection

Connections are registered as transient and injected into repositories:

```csharp
// Infrastructure/Extensions/ServiceCollectionExtensions.cs
services.AddTransient<NpgsqlConnection>(_ => new NpgsqlConnection(connectionString));
```

Repositories receive `NpgsqlConnection` via constructor injection.

### 3.2 Repository Pattern

```csharp
// Infrastructure/Repositories/SongRepository.cs
namespace PanoramaMusic.Infrastructure.Repositories;

public class SongRepository(NpgsqlConnection connection) : ISongRepository
{
    public async Task<IEnumerable<Song>> GetAllAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT id, title, artist
            FROM songs
            ORDER BY title;
            """;

        return await connection.QueryAsync<Song>(sql);
    }
}
```

Rules:
- SQL is always a `const string` using raw string literals (`"""`).
- Use `QueryAsync` / `ExecuteAsync` — no synchronous Dapper methods.
- Pass parameters as anonymous objects: `new { Id = id }`.
- Never build SQL by string concatenation — always use parameterised queries.
- Keep SQL readable: uppercase keywords, one clause per line.

### 3.3 Transactions

Use `connection.BeginTransaction()` and pass the transaction explicitly to Dapper:

```csharp
await connection.OpenAsync(ct);
await using var tx = await connection.BeginTransactionAsync(ct);
try
{
    await connection.ExecuteAsync(sql, param, transaction: tx);
    await tx.CommitAsync(ct);
}
catch
{
    await tx.RollbackAsync(ct);
    throw;
}
```

---

## 4. DbUp Migration Conventions

Migrations live in `src/PanoramaMusic.Infrastructure/Persistence/Migrations/` and are embedded resources.

### 4.1 File Naming

```
V{###}__{snake_case_description}.sql
```

- `{###}` — zero-padded three-digit sequence number, e.g. `001`, `002`, `042`.
- Double underscore (`__`) separates the version from the description.
- Description is `snake_case`, all lowercase, concise.

**Examples:**
```
V001__baseline.sql
V002__add_songs_table.sql
V003__add_artist_column_to_songs.sql
```

### 4.2 Migration Rules

- Migrations are **irreversible** — never modify an already-applied script.
- Each migration must be idempotent where possible (use `IF NOT EXISTS`, `IF EXISTS`).
- The journal table is `public.__schema_versions`.
- Seed scripts follow the same naming scheme with an `S` prefix (`S001__baseline_seed.sql`) and live in `Persistence/Seeds/`.

### 4.3 Embedding

Set `Build Action` to `Embedded Resource` in the `.csproj`, or use the glob:

```xml
<ItemGroup>
  <EmbeddedResource Include="Persistence\Migrations\*.sql" />
  <EmbeddedResource Include="Persistence\Seeds\*.sql" />
</ItemGroup>
```

The `DatabaseMigrator` selects migration scripts by matching `.Contains(".Migrations.")` in the embedded resource name.

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
