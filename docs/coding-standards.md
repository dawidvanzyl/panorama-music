# Coding Standards — Shared Workflow Spec (v1.4)

Global workflow rules for the Panorama Music project, applying across backend and
frontend unless a stack-specific standard constrains them. Shared Standards outrank the
Backend and Frontend Standards (§4).

---

## 0. Issue Conventions

Every issue kind has a required title prefix and label, enforced by the matching
`.github/ISSUE_TEMPLATE/*.md` — do not deviate from either.

| Issue kind | Title prefix | Label | Template |
|---|---|---|---|
| Epic | `[Backlog]` | `epic: backlog` | `epic-issue.md` |
| Feature sub-issue | `[Feature]` | `type: feature` | `sub-issue.md` |
| Bug | `[Bug]` | `type: bug` | `sub-issue.md` (same shape, swap prefix/label) |
| Tech debt | `[Tech Debt]` | `type: tech-debt` | `tech-debt-issue.md` |

**A milestone tag/number (e.g. `1.1`, used for branch and tag naming) is read from the
assigned GitHub milestone's own title (`gh issue view {n} --json milestone`) — never
parsed from the issue's own title text.** Epic and sub-issue titles never encode a
milestone tag.

---

## 1. Branching

### 1.1 Branch types

Every branch is tied to a GitHub issue, cut from the correct base branch (§1.2), kept
short-lived, and merged only via PR.

- **Feature / bug / tech-debt:** `{feature|bug|tech-debt}/{issue_number}-{slug}`. The
  prefix comes from the issue's label — `type: feature` → `feature/`, `type: bug` →
  `bug/`, `type: tech-debt` → `tech-debt/`. The slug is kebab-case from the issue title,
  max 5 words. No milestone number in the name; milestone membership is the issue's
  GitHub milestone field. Example: `feature/55-coding-standards-backend-cleanup`.
- **Milestone:** `milestone/m{milestone_number}` — the integration branch for grouped
  work, receiving merges only from feature branches (Mode A). `milestone_number` comes
  from the epic's assigned milestone title (§0), never the epic issue's title. Example:
  `milestone/m0`.

### 1.2 Workflow modes

Every change, in every mode, lives on a branch and reaches its target through a PR.
Direct commits to `master` are forbidden, and the topology is never bypassed.

- **Mode A — milestone-driven** (pre-v1.0 and major release cycles): milestones are
  mandatory; each feature branch belongs to exactly one milestone; the milestone branch
  is the integration boundary. Topology: `{feature|bug|tech-debt}/* → milestone/m{n} →
  master`. No feature branch merges directly into `master`.
- **Mode B — direct-to-master** (post-v1.0): feature branches merge directly into
  `master`; milestones are not required for normal work. Topology:
  `{feature|bug|tech-debt}/* → master`.

---

## 2. Commit Messages

Format: `{type}({scope}): {short description}`.

- **Allowed types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`.
- **Scope** must match an existing folder or module name exactly — no invented scopes,
  synonyms, duplicates, or abbreviations that don't match the code structure.
- **Breaking changes** are marked with `!`, e.g. `feat(api)!: change song response
  contract` or `feat!: redesign authentication flow`.
- **Hygiene:** imperative mood, no trailing period, subject ≤ 72 characters, body for
  non-trivial changes.

Examples: `feat(api): add song endpoint` · `fix(db): correct migration ordering` ·
`refactor(ui): simplify song card component`.

---

## 3. Pull Requests

- **Title:** `{issue_title} (#{issue_number})`. **Body:** a change summary,
  `Closes #{issue_number}`, and the milestone reference if applicable.
- **Targets:** `milestone/m{n}` (Mode A only) or `master`. The flow follows the mode
  topology (§1.2); `milestone → master` is Mode A's final integration step.
- **Creation gate** — a PR is not opened until the solution builds, formatting/linting
  passes, and all tests pass.
- **Merge gate** — a PR is not merged until CI passes, tests pass, and the issue is
  linked.
- **Merge strategy:** feature/bug/tech-debt branches are always squash-merged into their
  target; milestone branches are always merge-committed into `master` (no squash, so
  history is preserved). No other merge strategies are permitted.

---

## 4. Documentation Hierarchy

Precedence: **Shared Standards** (highest) → **Backend / Frontend Standards**.

- Shared governs the branching model, commit structure, PR lifecycle and merge rules,
  and milestones and workflow modes.
- Backend governs C#/ASP.NET Core/Dapper/DbUp/SQL, domain and application architecture,
  data access, and backend testing.
- Frontend governs TypeScript, Web Components architecture, CSS structure, and
  frontend service/API usage.

On any conflict, Shared wins and the stack doc is updated to conform. A stack doc may
never override a Shared rule or introduce an alternative branch type, merge flow, PR
requirement or commit-structure exception; exceptions exist only if added here.

---

## 5. Acceptance Criteria Test Codes

- **Format:** unit tests (backend and frontend) `{issue_number}UC{n}`; Playwright E2E
  `{issue_number}IT{n}`. Codes are scoped to an issue's own number, never a milestone.
  In a sub-issue body two numbers can appear: UC codes use **that sub-issue's** number,
  while IT codes (under `## Epic Reference` and `## Acceptance Criteria (G/W/T) > ###
  E2E`) are copied verbatim from the **epic's** Acceptance Criteria and carry the epic's
  number.
- One IT code per Playwright spec file/`describe` block, repeated across every G/W/T
  line that block covers.
- Never use `NFC` as a code — assign a real `UC`/`IT` code.
- No suffixes or variants (`317UC-bug1`, `317UC3a`). A test added during rework takes
  the next free `{issue_number}UC{n}`.
- Codes are opaque literal match strings to the runners (`dotnet test --filter
  "AC=CODE"`, vitest `--tags-filter="AC=CODE"`, `playwright test --grep "@CODE"`); the
  format carries no meaning to tooling beyond the literal string.
- **Not retroactive:** applies to all new issues going forward, never retroactively.
  Existing milestone-prefixed codes (e.g. `M1UC12`, `@M1.2IT3`) on already-created
  issues and tests remain valid — do not rename or migrate them.

## 6. Code Comments

The code speaks for itself. Names, types and small functions carry the intent; a
comment is the exception, written only when the code cannot say it.

- **Default to none.** Before writing one, try renaming or extracting until it is
  unnecessary.
- **Allowed:** a non-obvious *why* — an invariant, a security or concurrency reason, a
  workaround for an external defect — that would surprise a competent reader. One or
  two lines. Public-API doc comments only where the project already uses them.
- **Never:** a restatement of what the code does; a story, issue, ruling, decision or
  review reference (`#317`, `R3`, `D4`, `review-1 Blocker 3`); a plan or journal
  label; a description of temporary state or of what a later story will change.
  That history lives in the PR and the journal, not the code.
- The same applies to test names, `[SuppressMessage]` justifications and other
  strings that read as prose.
