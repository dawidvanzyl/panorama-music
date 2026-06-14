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

- **IT codes** — from `## Epic Reference > Acceptance Criteria Covered`,
  lines matching:
  ```
  - [ ] `[IT_CODE]` <text>
  ```
- **UC codes** — from `## Acceptance Criteria (G/W/T)`, lines matching:
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

#### Backend (IT and UC under `### Backend`)

For each code:

```bash
grep -r '\[Trait("AC", "CODE")\]' src/ --include="*.cs"
```

- Not found → ❌ FAIL ("no test tagged with this AC code").
- Found → run:
  ```bash
  dotnet test --filter "AC=CODE" --no-build
  ```
  - Pass → ✅ PASS
  - Fail → ❌ FAIL

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

---

### 4) Evaluate results

Compute:

- `n` = codes with ✅ PASS
- `m` = total codes (IT + UC)

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
- For each ✅ PASS code, change `- [ ] \`[CODE]\`` to `- [x] \`[CODE]\`` in
  the corresponding section.
- Leave ❌ FAIL codes as `- [ ]`.
- Only write the body if at least one checkbox state actually changes.

```bash
gh issue edit #{issue_number} --body-file <updated-body>
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
- IT codes: list with ✅/❌
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