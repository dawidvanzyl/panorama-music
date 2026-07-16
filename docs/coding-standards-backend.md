# Backend Coding Standards

C#, ASP.NET Core, Dapper, DbUp, PostgreSQL, and xUnit conventions for the Panorama Music project.

> For workflow, branching, commit, and pull request rules see `coding-standards.md`.
>
> For frontend conventions see `coding-standards-frontend.md`.
>
> Code style, formatting, naming, and language preferences are governed by `.editorconfig` and must not be duplicated in this document.

---

# 1. Architectural Principles

## Domain-Driven Design

The backend follows a pragmatic Domain-Driven Design (DDD) architecture.

The purpose of the architecture is to:

* Keep business rules isolated from infrastructure concerns.
* Keep domain concepts explicit and discoverable.
* Ensure dependencies flow inward toward the domain.
* Make bounded contexts independently evolvable.

Business concepts should be modelled explicitly within the domain rather than being hidden inside repositories, route handlers, SQL, or infrastructure services.

---

## Bounded Contexts

A bounded context owns its own:

* domain model
* application logic
* infrastructure implementation
* persistence concerns
* tests

Each bounded context may own its own database schema and internal persistence structure.

Bounded contexts should communicate through application contracts rather than directly referencing each other's infrastructure concerns.

---

# 2. Layer Responsibilities

The solution is organised into four architectural layers.

Dependencies must always flow inward.

```text
Api
 ↓
Application
 ↓
Domain

Infrastructure
 ↓
Domain
```

The Domain layer must never depend on Application, Infrastructure, ASP.NET Core, Dapper, PostgreSQL, or other external frameworks.

---

## Domain

The Domain layer contains business concepts and rules.

Typical contents include:

* entities
* value objects
* domain services
* domain exceptions
* domain interfaces

Responsibilities:

* enforce business invariants
* model business behaviour
* define contracts required by the domain

The Domain layer must not contain:

* HTTP concepts
* database access
* SQL
* framework-specific concerns
* infrastructure concerns

---

## Application

The Application layer orchestrates use cases.

Typical contents include:

* commands
* queries
* handlers
* application services
* validation
* request and response contracts

Responsibilities:

* coordinate domain behaviour
* coordinate infrastructure contracts
* implement use-case workflows

The Application layer contains orchestration logic, not business rules.

---

## Infrastructure

The Infrastructure layer implements external concerns.

Typical contents include:

* repositories
* database access
* PostgreSQL function calls
* DbUp migrations
* external service integrations
* dependency injection registration

Responsibilities:

* implement application and domain contracts
* perform external I/O
* map persistence structures to domain concepts

> Business rules must not be implemented in Infrastructure.
> Infrastructure implements contracts defined in Application and Domain but does not depend on either.

---

## Api

The Api layer hosts the application.

Typical contents include:

* route registration
* middleware configuration
* application bootstrapping
* dependency injection configuration

Responsibilities:

* receive requests
* delegate to application use cases
* return responses

Route handlers must remain thin and must not contain business logic.

---

# 3. Folder Organisation

## Placement Principles

Code is organised according to responsibility.

Folder names are always plural.

Prefer folders that clearly communicate responsibility.

Examples include:

* Entities/
* ValueObjects/
* Exceptions/
* Interfaces/
* Handlers/
* Repositories/
* Services/
* Factories/
* Extensions/

These examples are not an exhaustive list.

If a clear responsibility-based folder exists, use it.

If no obvious responsibility folder applies, organise by domain concept, aggregate, feature, or use case.

---

## Prohibited Catch-All Folders

The following patterns are prohibited:

* Common/
* Helpers/
* Utilities/
* Misc/
* Shared/

Every artefact must have a clearly defined responsibility and location.

---

## Interface Placement

When an interface is defined in a different layer from its implementation, place the interface in an `Interfaces/` folder within the layer that defines it.

When an interface and implementation belong to the same layer, place them together within the same responsibility folder.

Interfaces should live where they are consumed rather than being unnecessarily centralised.

---

# 4. Domain Modelling

## Entities

Entities represent concepts with identity and lifecycle.

Entities should:

* protect their own invariants
* expose behaviour rather than state manipulation
* own business rules that apply to themselves

Entity state changes should occur through domain behaviour rather than external mutation.

---

## Value Objects

Value objects represent concepts defined entirely by their value.

Value objects should:

* encapsulate validation
* enforce invariants at creation time
* be immutable

Invalid value objects must not be constructible.

---

## Domain Services

Domain services are appropriate when behaviour belongs to the domain but does not naturally belong to a specific entity or value object.

Domain services should be used sparingly.

---

# 5. PostgreSQL Conventions

PostgreSQL is the authoritative persistence technology for the project.

The database should be treated as part of the architecture, not merely a storage mechanism.

---

## Schemas

Database objects must belong to explicit schemas.

Each bounded context may own its own schema structure.

Avoid placing application-owned objects directly into the default schema.

---

## Functions

Database access is performed through PostgreSQL functions.

Repository implementations call functions rather than issuing inline SQL statements.

Function naming should:

* use snake_case
* be verb-oriented
* communicates intent clearly

Examples:

* get_songs
* create_song
* delete_song_by_id

Function parameters should:

* use snake_case
* use a `p_` prefix

Examples:

* p_song_id
* p_user_id
* p_email

Each function must perform exactly one create, update, or delete operation. Do not combine multiple write operations into a single function for the sake of atomicity — when several writes must succeed or fail together, keep each as its own single-purpose function and execute them within the shared ambient transaction (see Transactions).

---

## SQL Style

SQL should prioritise:

* readability
* explicitness
* maintainability

Avoid:

* hidden side effects
* overly complex functions
* duplicated business rules between SQL and the domain code

Business rules belong in the domain unless persistence-specific behaviour requires database enforcement.

---

# 6. Data Access

## Repository Responsibilities

Repositories provide persistence access for domain concepts.

Repositories are responsible for:

* calling PostgreSQL functions
* mapping persistence structures
* returning domain concepts

Repositories are not responsible for:

* business rules
* application workflows
* request orchestration

---

## DTOs

Persistence DTOs belong to Infrastructure.

DTOs exist to:

* represent persistence shapes
* isolates database structures from domain models

Repositories should map DTOs to domain concepts before returning results.

---

## Mapping

Mapping logic should be reusable and independently testable.

Prefer dedicated mapping extensions or components to embedding complex mapping logic directly in repositories.

---

## Transactions

The canonical transaction pattern is the shared Unit of Work in `PanoramaMusic.Persistence`.

`IUnitOfWork` exposes the active `IDbConnection` and `IDbTransaction` and is registered as **scoped**, so every repository resolved within one HTTP request shares the same connection and transaction — including repositories from different bounded contexts (e.g. an Identity write and its Audit record commit or roll back together).

The `UnitOfWorkMiddleware` in the Api layer is the **sole owner of the transaction lifecycle**: it calls `BeginAsync` before the endpoint executes, `CommitAsync` after a successful response, and `RollbackAsync` when an exception propagates. No handler or repository begins, commits, or rolls back a transaction directly.

A repository method resolves `IUnitOfWork` from DI (via `RepositoryBase`) and executes its database function call as a straight command on the shared connection and transaction:

```csharp
public class ExampleRepository(IUnitOfWork unitOfWork)
    : RepositoryBase(unitOfWork), IExampleRepository
{
    public async Task DoWriteAsync(/* args */, CancellationToken cancellationToken)
    {
        var command = CreateCommandDefinition(
            "identity.example_function",
            new { /* params */ },
            Transaction,
            cancellationToken);
        await Connection.ExecuteAsync(command);
    }
}
```

When several writes must succeed or fail together, the handler calls each single-purpose repository method in sequence — the ambient transaction makes them atomic. See `UserRepository.CreateAsync` and `DeactivateUserHandler` (deactivate + revoke sessions) for existing examples of this pattern.

Read methods use the same shared connection and transaction — repositories resolve their database access exclusively from `IUnitOfWork`; bounded contexts do not own connection factories of their own.

Code that runs outside the HTTP pipeline (hosted services, integration tests) creates its own scope and therefore owns the unit-of-work lifecycle itself: begin, perform the writes, then commit — see `AdminSeedService` for an example.

**Isolated writes.** A deliberate security write that must persist even when the request fails (e.g. revoking a refresh-token family on replay detection before rejecting the request) is wrapped in `IUnitOfWork.ExecuteIsolatedAsync`. The delegate runs on a fresh connection and transaction that commits independently of the ambient request transaction; repositories participate unchanged. See `RefreshTokenHandler` for the two existing call sites. Use this sparingly — an isolated write is intentionally *not* atomic with the rest of the request.

Application handlers coordinate use cases; they never manage database transactions.

---

# 7. DbUp Conventions

Database changes are managed through DbUp.

---

## Script Categories

Database scripts are separated by responsibility:

* schema changes
* function definitions
* seed data

These concerns must remain separated, each tracked by its own DbUp journal table.

---

## Naming and Versioning

Schema/table migration scripts use a per-domain counter (e.g. `01__create_x_table.sql`, `02__create_y_table.sql`), scoped to the bounded context's own `Migrations` folder. There is no shared counter across bounded contexts — each context numbers its own migrations independently.

Migration scripts are immutable once applied.

Never modify a migration that has already been executed in another environment.

New behaviour requires a new script.

Function scripts use a descriptive, unversioned name matching the function (e.g. `create_user.sql`). Because functions are deployed with `CREATE OR REPLACE` semantics, a behaviour change to an existing function is made by editing its file in place rather than adding a new versioned file.

Function and seed scripts run on every deploy (`RunAlways`), not just once — only schema/table migrations are journal-gated to apply exactly once. Every seed script must therefore be safely re-runnable: use `ON CONFLICT DO NOTHING` or a `WHERE NOT EXISTS` guard so re-applying it on an already-seeded database is a no-op rather than a duplicate-insert error.

---

## Execution Order

Database updates execute in the following order:

```text
Schema
 ↓
Functions
 ↓
Seeds
```

This order must remain consistent.

---

## Function Evolution

Function definitions should use replacement semantics where possible.

When a function signature changes incompatibly, explicitly remove the previous version before recreating it.

---

# 8. Testing Principles

Testing exists to validate behaviour, not implementation details.

---

## Test Ownership

Each bounded context must have its own isolated test suite covering unit and integration concerns
appropriate to that context.

Start with a single test project per bounded context (e.g. `PanoramaMusic.Audit.Tests`). Split
further into one project per architectural layer — `{Context}.Domain.Tests`,
`{Context}.Application.Tests`, `{Context}.Infrastructure.Tests` — once that context's test suite
has grown large enough that a single project mixes concerns across layers in practice (see
`PanoramaMusic.Identity.*.Tests` for the split form). A handful of files testing one or two classes
does not warrant the split; a few dozen files spanning entities, handlers, and infrastructure
services does.

---

## Shared Test Infrastructure

When a bounded context's test suite is split by layer, code shared across those projects —
composition-root fixtures, entity-builder factories, assertion helpers — lives in the context's
original, unsplit test project (e.g. `PanoramaMusic.Identity.Tests`), which the layer-specific
projects reference via `ProjectReference`. That project owns no `[Fact]`/`[Theory]` methods itself
once the split is complete; it exists purely as shared test infrastructure.

Anything in that shared project consumed by another project must be `public` — `internal` members
are invisible across assembly boundaries, and a `ProjectReference` does not change that.

Two distinct fixture shapes are used, depending on what the tests behind them need:

**Composition-root fixture** — for a bounded context where many test classes resolve real
handlers/services wired against mocked dependencies. A `{Context}TestFixture` class exposes a
`CreateContext()` method that builds a fresh `IServiceCollection`, registers every handler/service/
repository the context's test classes need, and returns it wrapped in a `{Context}TestContext`.
The context groups its mocks by concern (`Repositories`, `Services`, `Options`, `Contexts`, ...) as
nested classes, each mock exposed as an auto-property (`public Mock<T> XMock { get; } = new();`) —
never as a `get { return new Mock<T>(...); }` block, which would silently hand out a fresh,
unconfigured mock instance on every access instead of the one the test configured. `CreateContext()`
must be called fresh in every test class's constructor — never cached across test classes — since
xUnit does not guarantee isolation of a fixture instance's mutable state across `[Fact]`s otherwise.
See `IdentityTestFixture`/`IdentityTestContext` (mocked, for fast unit tests of Application/
Infrastructure) and `UnitOfWorkDatabaseFixture`/`UnitOfWorkDatabaseContext` (same shape, but wired
against a real Testcontainers-backed Postgres instance for cross-context transaction integration
tests) for the two variants of this pattern.

**Simple lifecycle fixture** — for a test class that just needs a live resource (a Postgres
container, an `HttpClient`) and no shared DI graph. Implement `IAsyncLifetime`, start/stop the
resource in `InitializeAsync`/`DisposeAsync`, and expose what tests need as plain properties.
Place this under the project's `Fixtures/` folder and consume it via `IClassFixture<T>`. See
`AuditDatabaseFixture` and `ApiTestFixture`.

Per-test helper objects that aren't fixtures in either sense above — e.g. a wrapper that bundles an
authenticated `HttpClient` with request-building convenience methods — belong in their own
responsibility folder (e.g. `ValueObjects/`), not forced into `Fixtures/`. See `IsolatedHttpClient`.

A private helper method may stay directly on a test class only when it is Moq.Protected()-style
setup inherently specific to that one class's mocked `HttpMessageHandler` (e.g. `SetupResponse`/
`SetupThrows` in `HibpPasswordServiceTests`) — there is nothing to share, since no other test class
mocks the same handler the same way. Anything reusable across test classes does not qualify for
this exception and must move to a fixture.

---

## Entity Factories

When multiple test classes need a domain entity built into a specific, reusable state (an active
user, a revoked refresh token, an expired invite), extract that construction into a static factory
class under the shared test project's `Factories/` folder (e.g. `UserFactory.CreateActive(...)`,
`RefreshTokenFactory.CreateRevoked(...)`). Always use the factory instead of constructing the entity
inline — this keeps entity-shape changes (a new constructor parameter, a new invariant) to one
place instead of every test file that builds that entity. Factory methods are `public static` for
the same cross-project reason as fixtures.

---

## Unit Tests

Unit tests should focus on:

* domain behaviour
* business rules
* validation
* use-case orchestration

Unit tests should remain fast and isolated.

---

## Integration Tests

Integration tests should focus on:

* repository behaviour
* PostgreSQL integration
* infrastructure implementations
* application wiring

Integration tests should verify collaboration between components rather than individual business
rules. A test class consuming a Testcontainers-backed fixture (composition-root or simple lifecycle)
must not alter that fixture's database-lifecycle wiring — only the fixture owns starting, migrating,
and disposing the container.

---

## Test Structure

Tests should follow Arrange / Act / Assert structure.

Use

* xUnit as the test framework
* Shouldly for assertions
* Moq for mocking framework

Name test methods `MethodUnderTest_Scenario_ExpectedOutcome` (e.g.
`HandleAsync_UserNotFound_ThrowsEntityNotFoundException`), describing the scenario, the condition,
and the expected outcome.

Tag every test with `[Trait("AC", "<code>")]` mapping it to the acceptance criterion it verifies.

When a test needs to assert more than one independent condition, group them with
`ShouldlyHelpers.Satisfy(() => ..., () => ...)` (wraps `Shouldly.ShouldSatisfyAllConditions`)
rather than a sequence of bare assertions — this ensures every condition is evaluated and reported
on failure, instead of the test stopping at the first one that fails.

---

## Test Project Setup

Test projects use `xunit.v3`, not `xunit`/`xunit.v2`. Set `TreatWarningsAsErrors` to `true` and
`IsTestProject` to `true`, matching the project's production-code counterpart's `TargetFramework`
and nullable/implicit-usings settings. Reference only the production projects and shared test
project(s) the tests actually need — do not reference a bounded context's own Api or another
bounded context's test project.

---

# 9. Architectural Constraints

The following are prohibited unless explicitly justified:

* business rules in route handlers
* business rules in repositories
* inline SQL in repositories
* direct infrastructure dependencies from the Domain layer
* catch-all folders
* cross-layer dependency violations
* duplication of business rules across layers

When in doubt, prefer explicit domain modelling and clear separation of responsibilities.

---

# 10. Environment Configuration

## QA-Environment Defaults

QA-environment defaults must be expressed as `${VAR:-default}` entries in `docker-compose.yml`'s `api` service `environment:` block, not as a committed `appsettings.{Environment}.json` file.

`docker-compose.yml` is the project's single source of truth for which environment variables the QA environment needs. It also serves as the reference for what to configure as environment variables on the actual QA deployment (Render). A second, parallel JSON-file mechanism duplicates that list and risks drifting from what the real deployment needs.

Production and Development configuration are unaffected by this rule — they continue to use `appsettings.json` / `appsettings.Development.json` as already established.