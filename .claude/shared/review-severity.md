# Shared review conventions

Referenced by the `review-issue` and `verify-implementation` skills. Both read
this file at the point their procedure says to. Edit it here — never inline a
copy back into a skill, or the two will drift.

## Severity levels

Apply these to every finding, whatever produced it — requirements, correctness,
standards, or security.

- ❌ **Blocker** — the implementation is incorrect, incomplete, or violates an
  explicit requirement or constraint. Must be resolved before merging.
- ⚠️ **Warning** — a soft concern: a missing safeguard, a questionable pattern,
  or something that works now but is likely to cause problems.
- ❓ **Question** — something ambiguous, underspecified, or inconsistent that
  cannot be judged without clarification. Do not guess; raise it.
- 💡 **Suggestion** — an out-of-scope observation worth noting for a future
  issue.

Rules that hold in both skills:

- Every finding cites a source — issue section + requirement text, doc +
  section, or file:line. If you cannot point to a specific source, it goes in
  Questions or Suggestions, not Blockers or Warnings.
- Work listed under the issue's `## Out of Scope` is never a Blocker or a
  Warning. If it is worth recording at all, it is a Suggestion.
- A diff that *implements* something listed under `## Out of Scope` is the
  reverse case and **is** a Blocker.
- Warnings, suggestions, and questions are non-gating, but they are not
  optional. Each one gets an explicit disposition from the implementer —
  actioned, deferred with a reason, or disputed with a cited reason.
- Per project policy, never file a GitHub tracking issue for a deferred
  finding. Raise it with the developer instead.

## Standards docs to read

Read the doc(s) for the affected scopes plus the matching `.editorconfig`:

- Always: `docs/coding-standards.md` (shared conventions)
- Backend scope (`src/` touched): `docs/coding-standards-backend.md`
- Frontend scope (`frontend/` touched): `docs/coding-standards-frontend.md`
- Backend formatting rules: `src/.editorconfig`
- Frontend formatting rules: `frontend/.editorconfig`

For each file in the diff, systematically check every applicable rule. Treat
each rule at face value — if the doc says "always do X" and the code does Y,
that is a violation regardless of intent. Cite doc + section on every finding.

A violation of a documented rule is a ❌ Blocker. An undocumented style
preference is at most a 💡 Suggestion.

If a standards doc does not exist for the relevant scope, note it and skip.

## Security review

Invoke the `asvs-security-review` skill in `delegated` mode, passing the diff
the calling skill already captured — do not re-fetch it. It performs the
`docs/security-standards.md` rule walk, scoped to the sections the diff actually
touches, and returns rows in the shared shape below with `Category` set to
`Security`. Merge its rows directly into the severity tables — do not print its
output as a separate report.

If it reports "no security-relevant code paths touched," note that and move on.

## Report column rules

Findings tables use `# | file:line | Category | Detail`.

- **file:line** — filename and line number, e.g. `Song.cs:42`. Use `—` for
  requirement-level findings with no single source line.
- **Category** — one word: Standards, Requirements, Correctness, Contract,
  Security, Design.
- **Detail** — quote the source (doc + section, or requirement text) and explain
  concisely.

Questions use `# | file:line | Question | Context` instead.
