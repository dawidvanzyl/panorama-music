# Coding Standards

This document defines the naming conventions, module structure rules, API response conventions, error handling standards, validation conventions, stored procedure conventions, and architectural boundary rules for this project. It serves as the reference for all future implementation — both for human review and as context for AI-assisted implementation sessions.

---

## 1. File and Folder Naming

- **Folders:** `kebab-case`
- **TypeScript files:** `kebab-case` with a descriptive suffix

| File type                      | Convention                          | Example                            |
| ------------------------------ | ----------------------------------- | ---------------------------------- |
| Entity                         | `{name}.entity.ts`                  | `user.entity.ts`                   |
| Repository interface           | `{name}.repository.ts`              | `user.repository.ts`               |
| Repository implementation      | `{name}.repository.prisma.ts`       | `user.repository.prisma.ts`        |
| Use case                       | `{verb}-{noun}.usecase.ts`          | `register-user.usecase.ts`         |
| Route handler                  | `{name}.routes.ts`                  | `auth.routes.ts`                   |
| DTO                            | `{verb}-{noun}.dto.ts`              | `register-user.dto.ts`             |
| Zod schema                     | `{verb}-{noun}.schema.ts`           | `register-user.schema.ts`          |
| Test                           | `{name}.{suffix}.test.ts`           | `user.entity.test.ts`              |
| Web Component                  | `{name}.component.ts`               | `app-root.component.ts`            |
| Stored procedure SQL file      | `sp-{verb}-{subject}.sql`           | `sp-get-student-summary.sql`       |

---

## 2. Module Structure

Every domain module lives under `packages/backend/src/modules/{name}/` and follows this layer structure:

```
packages/backend/src/modules/{name}/
├── domain/          # Entities, value objects, repository interfaces, domain errors
├── application/     # Use cases, DTOs, application service interfaces
├── api/             # Fastify route handlers, request/response schemas
└── infrastructure/  # Repository implementations (Prisma), stored procedures, external adapters
```

### Dependency rules

These rules govern imports **between module layers and between modules**. External packages (e.g., Prisma, Zod, Fastify) and shared/generated code (e.g., `src/generated/`, `src/shared/`) may be imported by any layer that legitimately requires them.

| Layer             | May import from                           |
| ----------------- | ----------------------------------------- |
| `domain/`         | Nothing — no imports from any other layer |
| `application/`    | `domain/` only                            |
| `api/`            | `application/` and `domain/`              |
| `infrastructure/` | `domain/` only                            |

No layer may import from another module's non-domain layer.

---

## 3. TypeScript Conventions

- **No `any`** — enforced by ESLint.
- Prefer `type` over `interface` for plain data shapes; use `interface` only when extension is intended.
- Prefer explicit return types on exported functions (not linter-enforced; apply as a convention for all public API boundaries).
- Use `const enum` for all application enumerations.
- No barrel files (`index.ts` re-exports) unless explicitly needed — import directly from source files.

---

## 4. API Response Conventions

All API responses follow a consistent envelope format.

### Success (single resource)

```json
{ "data": { ... } }
```

### Success (list)

```json
{ "data": [ ... ], "meta": { "total": 0 } }
```

### Error

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [ ... ] } }
```

- HTTP status codes follow REST conventions strictly.
- Error codes are uppercase `snake_case` strings (e.g., `NOT_FOUND`, `UNAUTHORISED`, `VALIDATION_ERROR`).

---

## 5. Error Handling

- Domain errors extend a base `DomainError` class and are thrown from the domain or application layer.
- The API layer catches domain errors and maps them to the appropriate HTTP responses.
- Unhandled errors are caught by Fastify's global error handler.
- No `try/catch` swallowing — all caught errors are either re-thrown or explicitly handled with a deliberate response.

---

## 6. Validation

- All incoming request data is validated with **Zod** at the API layer before reaching use cases.
- Use cases receive validated, typed DTOs — they do not validate input themselves.
- Zod schemas are defined alongside the route they validate.
- Use `parse` (throws on failure), not `safeParse`, at the API boundary. Thrown `ZodError` instances are caught by the global error handler and mapped to the standard error envelope.

---

## 7. Stored Procedure Conventions

Stored procedures are used for data logic that benefits from execution inside the database engine — complex reads, multi-table aggregations, or operations where multiple round-trips would be costly.

### Definition

- Stored procedures are defined as raw SQL in dedicated `.sql` files within the Prisma migration that introduces them.
- File naming: `sp-{verb}-{subject}.sql` (e.g., `sp-get-student-summary.sql`).
- The `.sql` file is executed within the migration using Prisma's `sql` support or embedded directly in the migration file.

### Calling conventions

- Stored procedures are called exclusively from repository implementations in the `infrastructure/` layer.
- Use `prisma.$queryRaw` for procedures that return results.
- Use `prisma.$executeRaw` for procedures that perform writes with no return value.
- Use Prisma's tagged template literal syntax for parameterised calls to prevent SQL injection:

```typescript
const result = await prisma.$queryRaw`SELECT * FROM sp_get_student_summary(${studentId})`
```

- No stored procedure calls outside the `infrastructure/` layer — domain and application layers are unaware of their existence.

### Naming (PostgreSQL)

- PostgreSQL function/procedure names: `snake_case` prefixed with `sp_` (e.g., `sp_get_student_summary`).

---

## 8. Test Naming

- Test files are co-located with the source file they test and use the suffix `.test.ts`.
- **Describe blocks:** name of the unit under test (e.g., `RegisterUserUseCase`).
- **It blocks:** `should {expected behaviour} when {condition}` (e.g., `should throw when email is already registered`).
