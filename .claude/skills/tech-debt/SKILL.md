---
name: tech-debt
description: >
  Load this skill when the user says "tech debt", "tech-debt", or "/tech-debt",
  or asks to file/track something they've identified as tech debt. Verifies the
  claimed problem still exists in the current code, drafts a single
  [Tech Debt]-prefixed issue from `.github/ISSUE_TEMPLATE/tech-debt-issue.md`,
  and creates it via `gh issue create` only after the user approves the draft.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **tech-debt**. Drafting a tech-debt issue..."

## Inputs

- `description`: free-form text describing the debt — what's wrong, and
  roughly where. Required.

If invoked with no description, ask: "What's the tech debt — what's wrong,
and roughly where in the code?" Do not proceed until given one.

## Procedure

### 1) Verify against the codebase (MANDATORY — do not skip)

Before drafting anything, locate and read the actual code the description
refers to.

- Use Grep/Glob/Read directly for a targeted lookup, or the `Explore` agent
  for a broader search, to find the relevant file(s).
- If the user's description references a PR, issue, or commit, fetch it via
  `gh` for background — but still read the current code. History explains how
  the debt got there, not whether it's still there.
- Confirm the described problem still reproduces in the code as it stands
  today. Code may have already changed since the debt was noticed.
  - If it does **not** reproduce (already fixed, refactored away, file
    deleted), stop and tell the user what you found instead, e.g. "This looks
    already resolved by #182 — want me to proceed anyway, or drop it?" Do not
    draft an issue for debt that no longer exists.
  - If the description is too vague to locate real code (no file, symbol, or
    feature named), ask one targeted question to narrow it down. Do not guess
    which code is meant.
- Once located, capture concretely — you will need this for Step 2:
  - The current implementation: exact file paths, class/method names, the
    relevant snippet.
  - Existing patterns elsewhere in the codebase the fix should follow (search
    for analogous services/handlers/components).
  - Related issues/PRs: `gh issue list` / `gh pr list` / `git log -p` /
    `git blame` on the affected file, if it clarifies why the code is this way.

### 2) Draft the issue body

- Read `.github/ISSUE_TEMPLATE/tech-debt-issue.md` — it is the authoritative
  structure. Stop and tell the user if it's missing.
- Populate every section using **only** what was confirmed in Step 1 or
  stated directly by the user. Do not invent constraints, patterns, or risks.
  - **Title:** `[Tech Debt] {short descriptive title}`
  - **Overview:** one paragraph, current state vs. desired state.
  - **Origin:** `Milestone: N/A — tech debt`; Work Areas as concrete
    remediation steps; `Discovered in:` the reference the user gave, or
    "flagged during this session" if none.
  - **Motivation & Risk:** why it exists, cost of leaving it, why now — each
    line must trace back to something read in Step 1. If you cannot
    substantiate one of the three, ask the user rather than filling it with
    generic filler.
  - **Context & Constraints:** current implementation (from Step 1), existing
    patterns to follow, known constraints, related issues.
  - **Functional Requirements:** observable behaviour only — no file names or
    function signatures.
  - **API / Interface Contract:** only include if a boundary actually
    changes; omit the section entirely for internal-only refactors.
  - **Acceptance Criteria (G/W/T):** use placeholder codes `{ISSUE}UC{n}` /
    `{ISSUE}IT{n}` — tech-debt issues have no epic to inherit codes from, so
    both UC and IT codes are invented fresh here, scoped to this issue's own
    number once it exists (resolved in Step 4) — never "NFC". Leave
    `### Frontend` or `### E2E` explicitly "N/A" if genuinely not applicable,
    don't delete the heading.
  - **Out of Scope:** explicit boundaries, referencing deferred work by
    `#issue` or future milestone where relevant.
- **Labels:** `type: tech-debt`, plus any applicable `layer:` / `priority:` /
  `context:` label based on where the code actually lives. Run
  `gh label list` to see the current set rather than guessing names.
- Save the full drafted body to a scratch file at
`c:\tmp\tech-debt-{slug}\draft-v1.md` **immediately**, before
presenting anything to the user.

### 3) Approval loop

Present the full drafted issue body to the user exactly as it will appear on
GitHub, then ask: "Does this look correct, or do you have changes?"

- **APPROVE** — copy the current draft to `final.md` in the same scratch
  directory, move to Step 4.
- **MODIFY** — incorporate the feedback, save as a new `draft-vN.md`
  (full snapshot, not a diff), re-present, repeat this step.
- **CLARIFY** — ask exactly one question, make no file changes, then
  re-present once answered.

### 4) Create the GitHub issue

- Pre-flight: `gh label list --json name`, confirm every label used in the
  draft exists. If any is missing, tell the user which one(s) and why, then
  create it with `gh label create "<name>" --description "..." --color "..."`.
- Create the issue from the saved file, not a shell variable, to avoid
  encoding corruption:
  `gh issue create --title "[Tech Debt] ..." --label "type: tech-debt" --label "..." --assignee dawidvanzyl --body-file final.md`
- Verify the exit code. On failure, show the error output and stop — do not
  retry blindly.
- **Resolve placeholders:** capture the issue number from the create output,
  substitute every `{ISSUE}` occurrence in `final.md` with that number, and
  run `gh issue edit {number} --body-file` with the patched body. Verify the
  exit code; if the edit fails, notify the user and stop — never leave an
  issue with an unresolved `{ISSUE}` placeholder in its body.
- On success, confirm: "Created #{number}: {title}" with the issue URL.

## Guardrails

- Step 1 (codebase verification) is never optional, even for a description
  that sounds obviously correct.
- Never fabricate `## Motivation & Risk` content — every line must trace back
  to something read in Step 1 or said explicitly by the user.
- Do not run `gh issue create` until the user has explicitly approved the
  final draft in Step 3.
- One issue per invocation. If the description bundles multiple unrelated
  debts, ask the user to split it rather than merging them into one ticket.
- Do not skip labels the repo already has an equivalent for — check
  `gh label list` before proposing a new one.
