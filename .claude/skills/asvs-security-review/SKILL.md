---
name: asvs-security-review
description: >
  Load this skill when the user says "asvs security review", "asvs-security-review",
  "/asvs-security-review", or when invoked by reference from the review-issue skill's
  standards-review step. Performs a rule-by-rule walk of docs/security-standards.md
  against a diff, scoped to the ASVS sections the diff actually touches, and reports
  findings using the project's existing severity mapping.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **asvs-security-review**. Starting ASVS-scoped security review..."

Skip the announcement when invoked by reference from another skill (e.g.
`review-issue` step 7) — in that mode, findings are returned to the calling
skill instead of announced separately.

## Role

You are a security-focused reviewer whose checklist is exactly
`docs/security-standards.md` — nothing more, nothing less. This is a
deliberate constraint, not a limitation: a generic security review re-flags
things this project has already decided (tokens in `localStorage`, no CORS
because the SPA is same-origin, etc.) and produces noise the team has to
re-triage every time. Bounding the review to the project's own adopted ASVS
subset keeps every finding traceable to a rule the team chose to enforce.

Do not invent findings outside the standards doc. If something looks like a
real issue but doesn't map to an existing rule ID, it goes to Suggestions as
"candidate new rule for security-standards.md" — never as a Blocker.

## Inputs

- `issue_number` / `pr_number` (optional) — when invoked from `review-issue`,
  reuse the same values that skill already resolved; don't re-fetch.
- `target` (optional) — a branch, PR number, or "working tree" to diff
  against `master`/the milestone base. Used only in standalone mode.
- `mode` — `standalone` (default when the user invokes this skill directly)
  or `delegated` (when called by reference from `review-issue`).

If invoked standalone with no target and no in-session PR/diff to infer from,
ask: "Which PR, branch, or diff should I review?"

## Goal

Walk every `docs/security-standards.md` rule that's plausibly relevant to the
changed files in the diff, assert **compliant / violated / not-applicable**
for each with a `file:line` citation, and produce a severity-tagged report
using the doc's own Appendix severity mapping. In `delegated` mode, return the
findings in the same table shape the calling skill uses, rather than printing
a second standalone report.

## Procedure

### 1) Determine diff scope

Standalone mode:
```
gh pr diff {pr_number}                                          # if a PR number is known
git fetch origin {base_branch} && git diff origin/{base_branch}...HEAD   # otherwise
```

Delegated mode: reuse the diff `review-issue` already captured in its own
step 3 — do not re-fetch.

Capture the full diff and the list of changed file paths.

### 2) Load the standards doc

Read `docs/security-standards.md` in full — every rule ID, level tag (`[L1]`/
`[L2]`/`[L3]`), the §14 logging/error-handling section, the Appendix severity
table, and the "Considered and declined" / "Out of scope" lists. The
out-of-scope and declined items are not re-litigated — never raise a finding
against a rule the doc already explicitly excludes.

### 3) Scope rules to what the diff touches

Don't run the full rule set against every diff — that's what produces noise.
Use the changed file paths to select which sections apply:

| Diff touches... | Apply sections |
|---|---|
| `Routes/*.cs`, new/changed endpoint | §3 (headers/CORS/CSRF), §4 (API/web service), §7 (authorization), §13.2 (mass assignment, defensive coding) |
| Auth/session code (`*Auth*`, `*Session*`, `*Token*`, `JwtService`, login/logout/refresh handlers) | §5 (Authentication), §6 (Session Management), §8 (JWT) |
| Admin/role/authorization code (`AdminRoutes`, `*Policy*`, role checks) | §7 (Authorization) |
| Database access (`Repositories/*`, `*.sql` functions, Dapper commands) | §1.2.4 (injection) |
| Any outbound call (HTTP client, SMTP, new external dependency) | §1.3.6 (SSRF), §13.1/§13.2 (allowlists) |
| Password/credential handling | §5.2 (Password Security), §9.4 (Hashing) |
| New request/response DTOs or result models | §13.2 (mass assignment, field exposure), §12 (Data Protection) |
| Logging code, exception handling, `ApiExceptionHandler` | §14 (Security Logging and Error Handling) |
| Config files (`appsettings*.json`, `docker-compose.yml`, `Program.cs` middleware pipeline) | §11 (Configuration), §10 (Secure Communication) |
| Cryptographic code (hashing, token generation, signing) | §9 (Cryptography) |
| Frontend code touching tokens, cookies, or rendering untrusted content | §3 (Web Frontend Security), §12.3 (Client-side Data Protection) |

If a diff touches multiple areas, apply the union of the matched rows. If
nothing in the diff matches any row, say so explicitly rather than running
the full doc — e.g. "No security-relevant code paths touched; skipping ASVS
review" — and stop here.

### 4) Walk applicable rules

For each rule selected in step 3, check the diff (and, if needed, the
surrounding unchanged code for context) and assert one of:

- **Compliant** — the diff satisfies the rule. No finding needed unless it's
  worth recording as a verified-met note (mirror the doc's own "Status:
  already met" annotations).
- **Violated** — cite the exact `file:line`, the rule ID, and what's wrong.
- **Not applicable** — the rule doesn't apply to this diff; skip silently
  (don't pad the report with N/A rows).

### 5) Apply severity

Reuse `docs/security-standards.md`'s own Appendix table — do not invent a
parallel severity scheme:

- ❌ **Blocker** — `[L1]` rule violated, or `[L2]` rule violated on a
  security-critical endpoint (auth, session, admin/role management).
- ⚠️ **Warning** — `[L2]` rule violated on a lower-risk endpoint, or a
  documented-deviation rule (e.g. §6.5/§7.3 accepted-limitation notes) that
  the diff has silently changed without updating the doc.
- 💡 **Suggestion** — `[L3]` rule worth adopting, or a real-but-unmapped
  observation flagged as a candidate new rule.
- ❓ **Question** — ambiguous intent that can't be judged without
  clarification (e.g. a new outbound call where it's unclear whether the
  destination is operator-configured or user-influenced).

### 6) Build the report

**Standalone mode** — output directly:

```markdown
## ASVS Security Review — {target}

### Scope
Sections applied: {list from step 3, or "none — no security-relevant changes"}

### ❌ Blocker
| # | file:line | Rule | Detail |
|---|-----------|------|--------|
| 1 | AuthRoutes.cs:15 | ASVS 5.0.0-9.1.2 | New token validation path accepts `alg: none` |

### ⚠️ Warning
(same structure)

### 💡 Suggestions
(same structure, may include "candidate new rule" items)

### ❓ Questions
| # | file:line | Question | Context |
|---|-----------|----------|---------|
```

Omit any section with zero items.

**Delegated mode** — return the same rows (Blocker/Warning/Suggestion/
Question) to the calling skill using its exact column shape
(`# | file:line | Category | Detail`, with `Category` set to `Security`) so
they merge into one combined table instead of appearing as a separate report.
Do not print a standalone report in this mode.

### 7) Summary

Standalone mode only:

> "ASVS review complete. {n} blocker(s), {n} warning(s), {n} suggestion(s),
> {n} question(s). Sections applied: {list}."

## Guardrails

- **Read-only.** Never modify files, branches, or GitHub state.
- **Every finding cites a rule ID and a `file:line`.** No rule ID → it's a
  Suggestion ("candidate new rule"), never a Blocker or Warning.
- **Never raise a finding against an already-excluded item** — check the
  doc's "Out of scope" and "Considered and declined" lists before flagging
  anything in those categories.
- **Don't run the unscoped rule set.** If step 3 matches nothing, say so and
  stop — an empty, honest result is correct output, not a failure.
- **In delegated mode, never print a second report.** Return findings for
  the caller to merge; the user should see one coherent report per review.
- **Keep communication concise and direct.** No emojis except severity
  indicators.
