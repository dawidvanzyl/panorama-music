# Backend Coding Standards

C#, ASP.NET Core, Dapper, DbUp, PostgreSQL, and xUnit conventions for the Panorama Music project.

> Workflow, branching, commit and PR rules: `coding-standards.md`. Frontend conventions:
> `coding-standards-frontend.md`. Code style, formatting, naming and language preferences are
> governed by `.editorconfig` and must not be duplicated here.

---

# 1. Architectural Principles

The backend follows a pragmatic Domain-Driven Design: business rules stay isolated from
infrastructure, domain concepts are explicit and discoverable, dependencies flow inward toward the
domain, and bounded contexts evolve independently. Model business concepts explicitly in the domain
rather than hiding them in repositories, route handlers, SQL, or infrastructure services.

A **bounded context** owns its domain model, application logic, infrastructure implementation,
persistence concerns and tests, and may own its own database schema. Contexts communicate through
application contracts, never by referencing each other's infrastructure.

---

# 2. Layer Responsibilities

Four layers, with dependencies always flowing inward:

```text
Api → Application → Domain      Infrastructure → Domain
```

The Domain layer must never depend on Application, Infrastructure, ASP.NET Core, Dapper, PostgreSQL,
or any other external framework.

- **Domain** — business concepts and rules: entities, value objects, domain services, domain
  exceptions, domain interfaces. Enforces invariants, models behaviour, and defines the contracts
  the domain needs. Must not contain HTTP, database access, SQL, or any framework/infrastructure
  concern.
- **Application** — orchestrates use cases: commands, queries, handlers, application services,
  validation, request/response contracts. Coordinates domain behaviour and infrastructure contracts
  and implements use-case workflows. Holds orchestration logic, not business rules.
- **Infrastructure** — implements external concerns: repositories, database access, PostgreSQL
  function calls, DbUp migrations, external integrations, DI registration. Implements the contracts
  defined in Application and Domain (depending on neither) and performs external I/O. Business rules
  must not live here.
- **Api** — hosts the application: route registration, middleware, bootstrapping, DI configuration.
  Receives requests, delegates to application use cases, returns responses. Route handlers stay thin
  and hold no business logic.

---

# 3. Folder Organisation

Organise code by responsibility. Folder names are always plural, and should communicate that
responsibility — e.g. `Entities/`, `ValueObjects/`, `Exceptions/`, `Interfaces/`, `Handlers/`,
`Repositories/`, `Services/`, `Factories/`, `Extensions/` (not exhaustive). Where no clear
responsibility folder applies, organise by domain concept, aggregate, feature, or use case.

**Prohibited catch-all folders:** `Common/`, `Helpers/`, `Utilities/`, `Misc/`, `Shared/`. Every
artefact has a clearly defined responsibility and location.

**Interfaces** placed in a different layer from their implementation go in an `Interfaces/` folder
within the layer that defines them; an interface and implementation in the same layer live together
in the same responsibility folder. Interfaces live where they are consumed, not centralised
unnecessarily.

---

# 4. Domain Modelling

- **Entities** represent concepts with identity and lifecycle. They protect their own invariants,
  expose behaviour rather than state manipulation, and own the business rules that apply to
  themselves. State changes occur through domain behaviour, not external mutation.
- **Value objects** are defined entirely by their value: they encapsulate validation, enforce
  invariants at creation, and are immutable. An invalid value object must not be constructible.
- **Domain services** are for behaviour that belongs to the domain but not to a specific entity or
  value object. Use them sparingly.

## Domain Events and the Shared Kernel

An **aggregate root** is the entity that owns a cluster of related state and the transactional
boundary around it — the single entry point through which that state is read and changed. Aggregate
roots record significant state transitions as **domain events** — immutable facts describing what
happened, raised by the behaviour that caused them. Domain events let cross-cutting consumers
(auditing today; projections or notifications later) observe the domain without the domain depending
on them.

The event primitives live in a dedicated, dependency-free shared-kernel project,
**`PanoramaMusic.Domain`**:

* `IDomainEvent` — marker for a domain event.
* `AggregateRoot` — base type that holds an aggregate's pending events, raises them, and lets
  infrastructure drain them.

Rules:

* `PanoramaMusic.Domain` is a pure leaf — no DI, no package references, no dependency on any bounded
  context. Every context's Domain layer may reference it; it references nothing.
* Dependencies point **toward** the kernel, never toward a consumer. A producing context's Domain
  layer references `PanoramaMusic.Domain`; it must never reference the Audit context, or any other
  event consumer. This keeps Domain layers free of audit and infrastructure concerns.
* Aggregates follow a **pull model**: an aggregate raises an event into its own pending-events list
  and never calls a collector, dispatcher, or logger. Infrastructure drains the pending events when
  the aggregate is persisted (see Auditing). The pull model is what keeps the kernel
  dependency-free.
* Events are self-describing — an event carries every value a consumer needs (identifiers,
  before/after values, display text) captured when it is raised, so consumers never re-query to
  enrich them.

---

# 5. PostgreSQL Conventions

PostgreSQL is the authoritative persistence technology and is treated as part of the architecture,
not merely storage.

**Schemas.** Database objects must belong to explicit schemas; each bounded context may own its own
schema structure. Avoid placing application-owned objects in the default schema.

**Functions.** Database access is performed through PostgreSQL functions — repositories call
functions rather than issuing inline SQL. Function names use snake_case, are verb-oriented, and
communicate intent (`get_songs`, `create_song`, `delete_song_by_id`); parameters use snake_case with
a `p_` prefix (`p_song_id`, `p_user_id`, `p_email`). Each function performs exactly one create,
update, or delete. Do not combine multiple writes into one function for atomicity — when several
writes must succeed or fail together, keep each as its own single-purpose function and run them in
the shared ambient transaction (see Transactions).

**SQL style** prioritises readability, explicitness and maintainability. Avoid hidden side effects,
overly complex functions, and business rules duplicated between SQL and domain code. Business rules
belong in the domain unless persistence-specific behaviour requires database enforcement.

---

# 6. Data Access

**Repositories** provide persistence access for domain concepts: they call PostgreSQL functions, map
persistence structures, and return domain concepts. They are not responsible for business rules,
application workflows, or request orchestration.

**DTOs** for persistence belong to Infrastructure. They represent persistence shapes and isolate
database structures from domain models; repositories map DTOs to domain concepts before returning.

**Mapping** logic should be reusable and independently testable — prefer dedicated mapping extensions
or components over complex mapping embedded in repositories.

## Transactions

The canonical transaction pattern is the shared Unit of Work in `PanoramaMusic.Persistence`.

`IUnitOfWork` exposes the active `IDbConnection` and `IDbTransaction` and is registered as
**scoped**, so every repository resolved within one HTTP request shares the same connection and
transaction — including repositories from different bounded contexts (e.g. an Identity write and its
Audit record commit or roll back together).

The `UnitOfWorkMiddleware` in the Api layer is the **sole owner of the transaction lifecycle**: it
calls `BeginAsync` before the endpoint executes, `CommitAsync` after a successful response, and
`RollbackAsync` when an exception propagates. No handler or repository begins, commits, or rolls back
a transaction directly.

A repository method resolves `IUnitOfWork` from DI (via `RepositoryBase`) and executes its database
function call as a straight command on the shared connection and transaction:

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

When several writes must succeed or fail together, the handler calls each single-purpose repository
method in sequence — the ambient transaction makes them atomic. See `UserRepository.CreateAsync` and
`DeactivateUserHandler` (deactivate + revoke sessions) for existing examples.

Read methods use the same shared connection and transaction — repositories resolve their database
access exclusively from `IUnitOfWork`; bounded contexts do not own connection factories of their
own.

Code that runs outside the HTTP pipeline (hosted services, integration tests) creates its own scope
and therefore owns the unit-of-work lifecycle itself: begin, perform the writes, then commit — see
`AdminSeedService`.

**Isolated writes.** A deliberate security write that must persist even when the request fails (e.g.
revoking a refresh-token family on replay detection before rejecting the request) is wrapped in
`IUnitOfWork.ExecuteIsolatedAsync`. The delegate runs on a fresh connection and transaction that
commits independently of the ambient request transaction; repositories participate unchanged. See
`RefreshTokenHandler` for the two existing call sites. Use this sparingly — an isolated write is
intentionally *not* atomic with the rest of the request.

Application handlers coordinate use cases; they never manage database transactions.

## Auditing

Audit records are produced by observing domain events, not by calling an audit logger from
application handlers. A handler contains no audit code; an aggregate raising a domain event (see
Domain Events and the Shared Kernel) is what ultimately produces an audit record.

The Audit context is a **transaction-scoped listener** over domain events:

* A request-scoped **collector** accumulates the domain events drained from aggregates as they are
  persisted.
* An audit-owned **translator** maps each domain event to an `AuditEvent`, enriching it with ambient
  request context (actor, source IP, correlation id). The producing context never constructs an
  `AuditEvent`.
* A **flush** drains the collector and writes the records on the shared `IUnitOfWork` connection
  **immediately before `CommitAsync`**, so each audit record commits in the same transaction as the
  business write that caused it.

No `IAuditLogger` or audit factory is injected into a handler.

**Two lanes.**

* **Transactional (default).** Flushed before commit on the ambient transaction; if the request
  rolls back, the audit record rolls back with it — an action that did not persist is not audited.
* **Durable.** A security event that must be recorded even when the request is rejected (e.g. a
  failed login or a detected token replay) is written on an independent connection that commits
  regardless of the request outcome, using the `ExecuteIsolatedAsync` mechanism described under
  Transactions. Use it sparingly — only where a security record must survive a rollback.

> The Identity context predates this pattern and still injects `IAuditLogger` directly into its
> handlers; it will be migrated. New contexts follow the domain-event model from the outset.

---

# 7. DbUp Conventions

Database changes are managed through DbUp.

**Script categories** are separated by responsibility — schema changes, function definitions, seed
data — each tracked by its own DbUp journal table.

**Naming and versioning.** Schema/table migration scripts use a per-domain counter
(`01__create_x_table.sql`, `02__create_y_table.sql`) scoped to the bounded context's own
`Migrations` folder; there is no shared counter across contexts. Migration scripts are immutable once
applied — never modify a migration already executed in another environment; new behaviour requires a
new script. Function scripts use a descriptive, unversioned name matching the function
(`create_user.sql`); because functions deploy with `CREATE OR REPLACE`, a behaviour change is made by
editing the file in place. Function and seed scripts run on every deploy (`RunAlways`); only
schema/table migrations are journal-gated to apply exactly once, so every seed script must be safely
re-runnable — use `ON CONFLICT DO NOTHING` or a `WHERE NOT EXISTS` guard so re-applying it is a
no-op, not a duplicate-insert error.

**Execution order:** Schema → Functions → Seeds. This order must remain consistent.

**Function evolution.** Use replacement semantics where possible; when a function signature changes
incompatibly, explicitly remove the previous version before recreating it.

---

# 8. Testing

Testing validates behaviour, not implementation details.

## Test Ownership

Each bounded context has its own isolated test suite covering the unit and integration concerns
appropriate to it. Start with a single test project per context (e.g. `PanoramaMusic.Audit.Tests`),
and split into one project per architectural layer — `{Context}.Domain.Tests`,
`{Context}.Application.Tests`, `{Context}.Infrastructure.Tests` — only once that suite has grown
large enough that a single project mixes concerns across layers in practice (see
`PanoramaMusic.Identity.*.Tests`). A handful of files testing one or two classes does not warrant the
split; a few dozen files spanning entities, handlers and infrastructure services does.

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

## Entity Factories

When multiple test classes need a domain entity built into a specific, reusable state (an active
user, a revoked refresh token, an expired invite), extract that construction into a static factory
class under the shared test project's `Factories/` folder (e.g. `UserFactory.CreateActive(...)`,
`RefreshTokenFactory.CreateRevoked(...)`). Always use the factory instead of constructing the entity
inline — this keeps entity-shape changes (a new constructor parameter, a new invariant) to one
place instead of every test file that builds that entity. Factory methods are `public static` for
the same cross-project reason as fixtures.

## Unit and Integration Tests

Unit tests focus on domain behaviour, business rules, validation and use-case orchestration, and
stay fast and isolated.

Integration tests focus on repository behaviour, PostgreSQL integration, infrastructure
implementations and application wiring, verifying collaboration between components rather than
individual business rules. A test class consuming a Testcontainers-backed fixture (composition-root
or simple lifecycle) must not alter that fixture's database-lifecycle wiring — only the fixture owns
starting, migrating and disposing the container.

## Test Structure

Follow Arrange / Act / Assert, using xUnit as the framework, Shouldly for assertions and Moq for
mocking. Name test methods `MethodUnderTest_Scenario_ExpectedOutcome` (e.g.
`HandleAsync_UserNotFound_ThrowsEntityNotFoundException`). Tag every test with
`[Trait("AC", "<code>")]` mapping it to the acceptance criterion it verifies. When a test asserts
more than one independent condition, group them with `ShouldlyHelpers.Satisfy(() => ..., () => ...)`
(wraps `Shouldly.ShouldSatisfyAllConditions`) rather than a sequence of bare assertions — this
ensures every condition is evaluated and reported on failure, instead of stopping at the first one.

## Test Project Setup

Test projects use `xunit.v3`, not `xunit`/`xunit.v2`. Set `TreatWarningsAsErrors` and `IsTestProject`
to `true`, matching the production-code counterpart's `TargetFramework` and nullable/implicit-usings
settings. Reference only the production projects and shared test project(s) the tests actually need —
do not reference a bounded context's own Api or another bounded context's test project.

---

# 9. Architectural Constraints

Prohibited unless explicitly justified: business rules in route handlers or repositories, inline SQL
in repositories, direct infrastructure dependencies from the Domain layer, catch-all folders,
cross-layer dependency violations, and duplication of business rules across layers. When in doubt,
prefer explicit domain modelling and clear separation of responsibilities.

---

# 10. Environment Configuration

QA-environment defaults must be expressed as `${VAR:-default}` entries in `docker-compose.yml`'s
`api` service `environment:` block, not as a committed `appsettings.{Environment}.json` file.
`docker-compose.yml` is the single source of truth for the environment variables the QA environment
needs, and the reference for what to configure on the actual QA deployment (Render); a parallel
JSON-file mechanism duplicates that list and risks drifting from the real deployment. Production and
Development configuration are unaffected — they continue to use `appsettings.json` /
`appsettings.Development.json` as already established.
