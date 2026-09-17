# Shared review conventions

Used by `review-pull-request`, `verify-implementation` and `plan-critique`. Edit it
here and never inline a copy into any of them, or they will drift.

`plan-critique` runs before any code exists, so it reuses the severity levels, the
sourcing rule and the standards-doc list below, but **not** the code-only parts: it has
no diff, so it anchors each finding at a **plan section, requirement or standard-doc
rule** instead of `file:line`, and it does not delegate an `asvs-security-review` (a
design-level security check against `docs/security-standards.md`, not a diff walk).

## Severity levels

These apply to every finding, whatever produced it: requirements, correctness,
standards or security.

- ❌ **Blocker**: incorrect, incomplete, or violating an explicit requirement,
  constraint or documented standard. It must be resolved before merging.
- ⚠️ **Warning**: a soft concern, such as a missing safeguard, a questionable pattern,
  or something likely to cause problems later.
- ❓ **Question**: ambiguous, underspecified or inconsistent, so it can't be judged
  without clarification. Raise it rather than guessing.
- 💡 **Suggestion**: an out-of-scope observation, or an undocumented style
  preference.

Rules:

- **Every finding cites a source**: an issue section and its requirement text, a doc
  and section, or a file:line. A finding you can't source is a Question or a
  Suggestion.
- Work that `## Out of Scope` excludes is at most a Suggestion. A diff that
  *implements* something listed there is the reverse case, and it is a Blocker.
- Warnings, Suggestions and Questions don't gate, but none is optional. Each one needs
  a disposition from the implementer: actioned, deferred with a reason, or disputed
  with a cited reason. Never file a GitHub tracking issue for a deferred finding;
  raise it with the developer instead.

## Standards docs to read

- `docs/coding-standards.md`: always.
- Backend (`src/` touched): `docs/coding-standards-backend.md` and `src/.editorconfig`.
- Frontend (`frontend/` touched): `docs/coding-standards-frontend.md` and
  `frontend/.editorconfig`.

If a doc doesn't exist, note that and skip it. Check every applicable rule against
every file in the diff, and take each rule at face value: if the doc says "always do
X" and the code does Y, that's a violation, whatever the intent.

## Security review

Invoke `asvs-security-review` in `delegated` mode with the diff you already captured;
don't re-fetch it. It walks `docs/security-standards.md`, scoped to the sections the
diff touches, and returns rows in the table shape below with `Category: Security`.
Merge those rows into your tables rather than printing them as a separate report. If
it reports "no security-relevant code paths touched", note that and move on.

## Report column rules

Findings tables use `# | file:line | Category | Detail`. Questions use
`# | file:line | Question | Context`.

- **file:line**: for example `Song.cs:42`. Use `—` for a requirement-level finding
  with no single line.
- **Category**: one of Standards, Requirements, Correctness, Contract, Security or
  Design.
- **Detail**: quote the source and explain it concisely.
