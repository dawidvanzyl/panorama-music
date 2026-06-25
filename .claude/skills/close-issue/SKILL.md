---
name: close-issue
description: >
  Load this skill when the user says "close issue", "close-issue", or "/close-issue".
  Verifies IT and UC acceptance criteria for a story issue, ticks off passing
  checkboxes, and closes the issue only if all criteria pass and the linked PR
  has been merged.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Announcement

At the start of execution, always post:

> "Loaded skill: **close-issue**. Verifying acceptance criteria and PR status..."

---

## Inputs

- `issue_number`: prefer to infer from the issue implemented earlier in the
  current session.
- `pr_number`: prefer to infer from the PR created earlier in the current
  session.

If either is missing, ask for it. Do not proceed until both are confirmed.

---

## Procedure

### 1) Check PR merge status (HARD GATE)

```bash
gh pr view #{pr_number} --json state,mergedAt
```

- If `state` is not `MERGED`:
  - Output: "PR #{pr_number} has not been merged (state: {state}). Issue
    #{issue_number} cannot be closed."
  - Stop execution. Do not proceed to AC verification.

---

### 2) Fetch issue and extract AC codes

```bash
gh issue view #{issue_number} --json title,body,milestone
```

Extract codes from the issue body, following the `sub-issue.md` template
structure:

- **IT codes** — there are only two code types, IT and UC; IT codes appear in
  two places in the issue body:
  - `## Epic Reference > Acceptance Criteria Covered`, lines matching:
    ```
    - [ ] `[IT_CODE]` <text>
    ```
  - `## Acceptance Criteria (G/W/T) > ### E2E`, lines matching the same
    `- [ ] \`[IT_CODE]\` <text>` shape. The same IT code is typically repeated
    across multiple lines here (one per G/W/T scenario covered by that spec
    file's tagged `test.describe` block) and commonly duplicates a code
    already listed under Epic Reference. Keep every line as a distinct
    checkbox to tick later, but dedupe codes before running anything (see
    step 3).
- **UC codes** — from `## Acceptance Criteria (G/W/T) > ### Backend` and
  `### Frontend`, lines matching:
  ```
  - [ ] `[UC_CODE]` <text>
  ```
  Note which subsection (`### Backend` / `### Frontend`) each UC lives under.

If a checkbox line does not match `- [ ] \`[CODE]\` ...`, skip it — do not
infer codes from free text.

If `## Acceptance Criteria (G/W/T)` is empty or absent, there are no UC codes
to verify; this is expected for sub-issues flagged with empty criteria in
`plan-milestone.md`. Note this and continue with IT codes only.

---

### 3) Verify each code

#### Backend (UC under `### Backend`, and IT codes with a matching backend trait test)

For each code:

```bash
grep -r '\[Trait("AC", "CODE")\]' src/ --include="*.cs"
```

- Found → run:
  ```bash
  dotnet test --filter "AC=CODE" --no-build
  ```
  - Pass → ✅ PASS
  - Fail → ❌ FAIL
- Not found:
  - UC code under `### Backend` → ❌ FAIL ("no test tagged with this AC code").
  - IT code → IT codes have no heading to bucket them by layer, so absence of
    a backend trait test only rules out backend; fall through to E2E below
    before deciding FAIL.

#### Frontend (UC under `### Frontend`)

For each code, do not assume location — search the whole frontend test suite:

```bash
npx vitest run --reporter=verbose --tags-filter="AC=CODE"
```

- No tests matched the tag → ❌ FAIL ("no test tagged with this AC code").
- Tests matched and passed → ✅ PASS
- Tests matched and failed → ❌ FAIL

> Run one filtered execution per code (this is the per-AC equivalent of the
> backend `--filter "AC=CODE"` run). Do not attempt to map a single full-suite
> run back to individual codes.

#### E2E (IT codes under `### E2E`, and Epic-Reference IT codes with no backend trait test)

These codes are verified by the Playwright suite (`e2e/`) instead of a
unit-test runner. Build the set of codes to verify here as the union of:
the Epic-Reference IT codes that fell through from the Backend step above,
and every distinct code listed under `### E2E` (the same IT code commonly
appears in both places, and repeated across multiple `### E2E` lines —
deduplicate before running anything; run each unique code only once).

Before verifying any code in this section, confirm the `qa` stack is healthy:

```bash
curl --silent --fail http://localhost:3000/api/health
```

- If this fails, bring the stack up first and wait for health before
  continuing:
  ```bash
  RESET_DB=true docker compose --profile qa up --build -d
  ```

For each unique code:

```bash
npx playwright test --tag @CODE
```

(run from the `e2e/` directory)

- No tests matched the tag → ❌ FAIL ("no test tagged with this AC code").
- Tests matched and passed → ✅ PASS
- Tests matched and failed → ❌ FAIL

Apply the result to every checkbox line carrying that code — in the Epic
Reference list and every repeated occurrence under `### E2E`.

---

### 4) Evaluate results

Compute, counting every checkbox line separately (a single IT code repeated
across multiple `### E2E` lines counts once per line, each carrying the
verification result of its underlying code):

- `n` = checkbox lines with ✅ PASS
- `m` = total checkbox lines (IT + UC)

---

### 4a) Failure handling (STOP CONDITION)

If `n < m`:

- Tick only the checkboxes for codes that are ✅ PASS (see step 5).
- Leave failing/not-found codes unchecked.
- Do **not** close the issue.
- Output:

  > "Acceptance criteria partially verified for #{issue_number}: {n}/{m}
  > passing. Issue remains open."

- Stop execution.

---

### 5) Update issue checkboxes (idempotent)

- Re-fetch the issue body before editing.
- For each ✅ PASS code, change `- [ ] \`[CODE]\`` to `- [x] \`[CODE]\`` for
  every matching checkbox line in the issue body (an IT code may appear on
  several lines under `### E2E`, plus once under Epic Reference — tick all
  of them).
- Leave ❌ FAIL codes as `- [ ]` on every matching line.
- Only write the body if at least one checkbox state actually changes.
- Do not write any temporary files. Pass the updated body directly via `--body`.

```bash
gh issue edit #{issue_number} --body "$(cat <<'EOF'
{updated body content}
EOF
)"
```

---

### 6) Close issue

Only reached if `n == m` (all codes passed in step 4).

If issue is already closed:

- Notify and continue.

If open:

```bash
gh issue close #{issue_number}
```

---

### 7) Summary

Return:

- PR merge status: merged
- AC result: n/m passing
- IT codes: list with ✅/❌ (noting Epic Reference vs `### E2E` occurrences if both exist)
- UC codes: list with ✅/❌ (grouped Backend/Frontend if applicable)
- Issue state: closed/open

## Guardrails

- Never close an issue if the linked PR is not merged.
- Never close an issue with any failing or unverifiable AC code.
- Never tick a checkbox for a code that did not pass.
- Re-fetch the issue body immediately before editing; never write a stale body.
- Do not modify epic/parent issue state — that is handled by `close-milestone`.
- Keep communication concise and direct. No emojis except status indicators
  (✅/❌).
- Never commit or push to the working tree
- Never make modification to any files on the working tree