# Coding Standards

This document is the authoritative reference for AI-assisted development sessions on the Panorama Music project.

Standards are split by stack to keep each document focused and reduce noise during AI sessions:

- **[coding-standards-backend.md](coding-standards-backend.md)** — C#, ASP.NET Core, Dapper, DbUp, xUnit
- **[coding-standards-frontend.md](coding-standards-frontend.md)** — TypeScript, Web Components, Vite, CSS

---

## Shared Conventions

### Git Branch Naming

```
feature/M{milestone_number}-{issue_number}-{slug}
```

- `{milestone_number}` — numeric milestone identifier, e.g. `0`, `1`.
- `{issue_number}` — GitHub issue number.
- `{slug}` — lowercase, alphanumeric + hyphens, derived from the issue title.

**Example:** `feature/M0-55-coding-standards-document-for-cs-dapper-dbup`

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
{type}({scope}): {short description}
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.

Scope is optional but recommended; use the milestone tag when relevant:

```
feat(m0): add songs table migration
docs(m0): rewrite coding standards for C#/Dapper/DbUp stack
fix(api): return 404 for unmatched /api/* routes
```

- Subject line: imperative mood, lowercase after the colon, no trailing period.
- Keep the subject under 72 characters.
- Add a body when the change is non-obvious; reference issues with `Closes #N` or `Refs #N`.

### Pull Requests

- Title: `{issue_title} (#{issue_number})`
- Body must include:
  - Brief overview of changes
  - `Closes #{issue_number}`
  - Milestone reference
- Target `master` or a `milestone/*` branch for all feature work.
- Squash-merge or rebase-merge; no merge commits on `master`.
