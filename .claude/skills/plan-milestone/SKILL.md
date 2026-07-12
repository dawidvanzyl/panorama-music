---
name: plan-milestone
description: >
  Load this skill when the user says "plan milestone", "plan-milestone", or
  "/plan-milestone". Derives sub-issues for a milestone epic, persists all
  artifacts to disk, enforces UI enrichment via Stitch, and creates GitHub
  issues only after full approval.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues
---

# Announcement

> Loaded skill: **plan-milestone**. Starting milestone planning workflow...

---

# Core Principle

This workflow is:

> filesystem-backed, deterministic, artifact-driven

No step relies on in-memory state.

All durable state is stored under:

```
/tmp/milestone-plan-{epic_issue_number}/
```

---

# Execution Contract (NON-NEGOTIABLE)

This system operates as a strict pipeline.

Each step has:

* explicit file inputs
* explicit file outputs
* no reliance on conversational or in-memory state

At no point may a step:

* use unstored intermediate state
* modify outputs from previous steps unless explicitly allowed
* bypass filesystem artifacts

---

# Phase Gate Contract (STRICT)

## Gate 1 → Plan Complete

Step 3 cannot begin until:

* 00-skeleton.md exists
* all Test Intent Maps exist
* UI gating resolved or explicitly excluded

## Gate 2 → UI Resolution Complete

A sub-issue is excluded from Step 3 if:

* ui_blocked = true AND ui_resolved != true

## Gate 3 → Build Lock

Once Step 3 begins:

* Step 2 outputs are immutable
* Test Intent Maps cannot change
* no new sub-issues may be introduced
* UI state cannot be re-evaluated

## Gate 4 → Approval Complete

GitHub creation only occurs if:

* ALL eligible sub-issues are approved

---

# 0) Resume / Initialize

If manifest exists:

* load `/tmp/milestone-plan-{epic}/manifest.json`
* ask: Resume or restart milestone plan?

If restart:

* delete directory
* reinitialize

---

# 1) Read Context (READ ONLY)

Fetch:

* Epic issue (`#{epic_issue_number}`)
* GitHub milestone metadata
* `.github/ISSUE_TEMPLATE/sub-issue.md`
* `docs/coding-standards.md` — git, commit, and PR conventions referenced
  during sub-issue drafting
* `docs/coding-standards-backend.md` and `docs/coding-standards-frontend.md`
  — read for domain conventions, naming patterns, and layer boundaries.
  These inform `## Context & Constraints` and `## Domain & Data` content,
  not implementation steps
* Backend scope: `src/.editorconfig`
* Frontend scope: `frontend/.editorconfig`
* Any architectural decisions, stack choices, naming conventions, or design
  constraints established earlier in the current session

Extract:

* `milestone_title`: fetch the epic's assigned GitHub milestone via
  `gh issue view {epic_issue_number} --json title,body,milestone`. Used only
  for the `--milestone` flag when creating sub-issues in Step 4 — sub-issue
  titles never carry a milestone tag.
  * If the epic has no milestone assigned, stop and ask the user to assign
    one on GitHub first. Do not proceed until confirmed, and do not fall
    back to parsing a tag out of the epic's own title text.

Store into manifest.

If `.github/ISSUE_TEMPLATE/sub-issue.md` cannot be found, stop execution and
inform the user. This file is the authoritative structure for Step 3 (3.0,
3.2) and the workflow cannot proceed without it.

---

# 2) Plan Phase (Deterministic Output Generation)

This phase produces ONLY filesystem artifacts.

---

## 2.1 Sub-issue decomposition

Reason about what sub-issues are needed to fully deliver the milestone's
acceptance criteria. Consider:

* **Behaviour groupings** — group by cohesive user-facing or system-facing
  behaviour, not by technical layer. A story that covers "user login" includes
  both the API contract and the login screen; it is not split into
  backend/frontend sub-issues.
* **Logical sequencing and blocking dependencies** — which stories must land
  before others can be started.
* **Scope boundaries** — what belongs in this milestone vs. a later one.
* **Testability reasoning per sub-issue** — for each derived sub-issue, reason
  about what observable behaviours can be verified. Think in terms of: given a
  state, when an action occurs, what outcome is guaranteed? This reasoning
  drives the `## Acceptance Criteria (G/W/T)` content captured in the Test
  Intent Map (2.2). If a sub-issue produces no testable behaviour
  (config-only, dependency updates, pure scaffolding), flag it as having
  empty criteria.

Do NOT plan sub-issues around layers (domain layer, infrastructure layer, etc.)
unless the epic itself is purely technical scaffolding with no user-facing
behaviour. For feature milestones, a story boundary is a behaviour boundary.

Important: Do NOT create separate "test" sub-issues. Every feature sub-issue
owns its acceptance criteria. Testing-related AWAs copied from the epic are
informational only and do not generate sub-issues.

Important: Do NOT create separate frontend-only sub-issues. Each screen must
be part of the same sub-issue as its backend behaviour.

Output:

```
/tmp/milestone-plan-{epic}/00-skeleton.md
```

This file is the ONLY source of truth for sub-issue structure. It must record,
per sub-issue:

* Proposed title (without milestone prefix yet)
* Proposed labels
* Blocking relationships / dependencies
* Whether it has testable behaviour (or is flagged empty)

---

## 2.2 Test Intent Map (SOURCE OF TRUTH)

For each sub-issue, create:

```
/tmp/milestone-plan-{epic}/issues/{id}/test-intents.json
```

This is the ONLY definition of behaviour.

It contains:

* UC codes
* GIVEN / WHEN / THEN

Derive one or more `[UC_CODE]` criteria using the placeholder form
`{ISSUE}UC{n}` (e.g. `{ISSUE}UC1`, `{ISSUE}UC2`) per epic AC this sub-issue
contributes to — `{ISSUE}` is resolved to this sub-issue's real issue number
in Step 4, once the issue exists. Each criterion maps to exactly one
verifiable behaviour. When a sub-issue spans both backend and frontend, group
entries under `backend` and `frontend`. If the sub-issue was flagged as
having no testable behaviour, this file contains an empty criteria set.

IT codes are not invented here — record which of the epic's own
`## Acceptance Criteria` codes (already `{epic_issue_number}IT{n}`, fixed at
epic-authoring time) this sub-issue covers, and copy them verbatim (code and
checkbox text). IT codes never use the `{ISSUE}` placeholder and never need
resolution in Step 4.

Test Intent Maps are IMMUTABLE after Step 2 completes.

---

## 2.3 UI Audit + Stitch Gate

This step consumes the ordered sub-issue list produced in 2.1. The "Sub-Issue"
column in the audit table below references those sub-issues by title.

Audit every acceptance criterion in the epic. For each AC, ask: "Does a human
interact with the system to satisfy this?"

Important distinctions the audit must apply:

* **An admin is a human.** If an AC says "Admin can create a user", the admin
  needs a screen — even if the result is delivered out-of-band.
* **A user is a human.** If an AC says "User can log in", the user needs a
  login screen.
* **"Out-of-band delivery"** refers to how a result reaches the human (email,
  SMS, etc.), but the human still needs a UI to trigger the action.
* **Do NOT create separate frontend-only sub-issues.** Each screen belongs in
  the same sub-issue as its associated behaviour.

Record the audit as a table in `00-skeleton.md`:

| AC | Human Interaction? | Screen Required | Sub-Issue |
|---|---|---|---|

For each AC that requires a screen, ensure the corresponding sub-issue is
marked `layer: frontend` alongside its backend labels in `00-skeleton.md`.
Sub-issues with no human interaction keep their existing labels.

If a sub-issue requires UI:

Generate Page Architecture:

* Screen description
* Component hierarchy (mermaid)
* User interaction flow (sequence diagram)

Then mark:

* ui_blocked = true

If Stitch output is returned:

* store in `/tmp/milestone-plan-{epic}/issues/{id}/ui.md`
* set ui_resolved = true

---

## 2.4 Step 2 Completion Rule (HARD GATE)

Step 2 is COMPLETE ONLY IF:

* 00-skeleton.md exists
* all test-intents.json files exist
* all UI-required issues are either:

  * ui_resolved OR excluded

---

## 2.5 Step 2 Output Restrictions

Step 2 MUST NOT produce:

* GitHub issues
* draft markdown
* acceptance criteria
* G/W/T formatting

ONLY structured filesystem artifacts.

---

# 3) Build Phase (Strict File-Only Rendering)

---

## 3.0 Step 3 Input Contract (CRITICAL)

Step 3 may ONLY use:

* /tmp/milestone-plan-{epic}/00-skeleton.md
* /tmp/milestone-plan-{epic}/issues/*/test-intents.json
* /tmp/milestone-plan-{epic}/issues/*/ui.md
* .github/ISSUE_TEMPLATE/sub-issue.md

NO OTHER INPUTS ARE ALLOWED.

---

## 3.1 Hard Filter (UI Exclusion Rule)

Exclude from Step 3 any sub-issue where:

* ui_blocked = true
* AND ui_resolved != true

These issues are NOT visible to Step 3.

---

## 3.2 Template Authority Rule

All issues MUST be built from:

```
.github/ISSUE_TEMPLATE/sub-issue.md
```

Template is authoritative over all structure. Each issue body must strictly
follow this structure. Sub-issue bodies do NOT include file paths, function
signatures, or implementation steps — the sub-issue describes what and why;
the implementing agent determines how.

---

## 3.3 Versioned Issue Model

Each sub-issue stored at:

```
/tmp/milestone-plan-{epic}/issues/{id}/
```

Versions:

* draft-v1.md
* draft-v2.md
* final.md
* meta.json

Each version is a FULL snapshot.

---

## 3.4 Drafting Rules

Each draft snapshot follows `.github/ISSUE_TEMPLATE/sub-issue.md` section-for-
section. Populate each template section from the Step 3 inputs (3.0) as
follows:

| Template section | Source |
|---|---|
| Title | `[Feature] {title}` from `00-skeleton.md` |
| Overview | Authored from the sub-issue's behaviour grouping in `00-skeleton.md` |
| Epic Reference | `#{epic_issue_number}`; Work Areas copied verbatim from epic AWA; Acceptance Criteria Covered = selective `[IT_CODE]` list from `test-intents.json` |
| Context & Constraints | Coding standards + prior session decisions; known constraints; related issues |
| Functional Requirements | Observable system behaviours only — no file names or signatures |
| Domain & Data | Entities/relationships/business rules — no schema or column types |
| API / Interface Contract | Endpoints, events/side-effects, UI entry points (frontend only) |
| Page Architecture | Only if `layer: frontend` and `ui.md` resolved — rendered directly from `issues/{id}/ui.md` |
| Acceptance Criteria (G/W/T) | Rendered directly from `test-intents.json`; grouped `### Backend` / `### Frontend` if both; empty if `test-intents.json` has empty criteria |
| Out of Scope | Scope boundaries from `00-skeleton.md`; reference deferred work by `#issue` or future milestone |

Sub-issue bodies must not include file paths, function signatures, or
implementation steps — the implementing agent determines how.

**Anticipated Work Areas** does not appear in sub-issues — it belongs to the
epic only (Step 6).

---

## 3.5 Approval Loop

For each sub-issue, present the full drafted body to the user exactly as it
will appear on GitHub, then ask:

> "Does this look correct, or do you have changes?"

Wait for the user's response, then proceed according to one of:

### APPROVE

* promote current draft to final.md
* mark approved in manifest
* confirm: "Draft for [Feature] {title} approved and stored."
* move to the next sub-issue

### MODIFY

* incorporate all feedback
* generate new full snapshot version
* store as draft-vN.md
* re-present full issue body
* repeat 3.5 until approved

### CLARIFY

* ask one question
* no file changes

---

## 3.6 Step 3 Completion Rule

Step 3 is complete only when:

* all eligible issues have final.md

---

# 4) GitHub Creation Phase

Only after ALL approved:

* **Pre-flight: verify all labels exist on GitHub.**
  * Scan all `final.md` sub-issue bodies and collect every unique label.
  * Run `gh label list --json name` and parse the existing labels.
  * For any missing label, notify and create it:
    `gh label create "<name>"`
* Create issues via `gh issue create` — iterate over the `final.md` bodies in
  order:
  * Run `gh issue create` with `--title`, `--milestone "{milestone_title}"`
    (from Step 1 — omit the flag entirely if the epic has none), `--label`,
    `--body-file`.
  * Verify the exit code. If creation fails, notify the user with the error
    output and stop.
  * On success, capture the created issue number.
  * **Resolve placeholders:** substitute every `{ISSUE}` occurrence in the
    just-created body with the real issue number (this only ever affects UC
    codes — IT codes already carry the epic's real number and need no
    substitution), then run `gh issue edit {number} --body-file` with the
    patched body. Verify the exit code; if the edit fails, notify the user
    with the error output and stop — never leave an issue with an unresolved
    `{ISSUE}` placeholder in its body.
  * Confirm to the user: "Created #{number}: {title}"
* Store issue number + URL in manifest

---

# 5) Linking Phase (Robust Mode)

For each issue:

Attempt GraphQL:

1. Fetch the GraphQL node IDs for the epic and all created sub-issues in a
   single query:
   ```
   gh api graphql -f query='{ repository(owner: "OWNER", name: "REPO") {
     epic: issue(number: EPIC) { id }
     i1: issue(number: N1) { id }
     ...
   } }'
   ```
2. For each sub-issue, run the `addSubIssue` mutation:
   ```
   gh api graphql -f query='mutation {
     addSubIssue(input: {issueId: "PARENT_ID", subIssueId: "CHILD_ID"}) {
       issue { number } subIssue { number }
     }
   }'
   ```
   Note: the REST API returns 404 for sub-issue linking — GraphQL is the only
   working approach.

Fallback:

* comment-based epic linking list

---

# 6) Epic AWA Safe Patch

---

## 6.1 Locate AWA block

```
/<!-- AWA_START -->(.*?)<!-- AWA_END -->/
```

---

## 6.2 Rules

* modify only inside markers
* idempotent inserts
* no reordering
* no deletions
* never uncheck or remove existing checked items

---

## 6.3 Entry format

```
- [ ] [Feature] Title (#{number})
```

---

## 6.4 Missing block

Append:

```
## Anticipated Work Areas

<!-- AWA_START -->
<!-- AWA_END -->
```

---

## 6.5 Atomic update

Single:

```
gh issue edit
```

---

# 7) Cleanup (Optional)

If enabled:

* delete `/tmp/milestone-plan-{epic}/`

---

# 8) Final Output

Return:

* total issues created
* issue list (number + URL)
* epic update confirmation
* manifest path
