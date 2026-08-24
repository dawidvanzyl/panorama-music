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

All durable state is stored in the milestone's **run journal**:

```
{HOME}/.claude/runs/panorama-music/m{milestone_number}/
```

Resolve `{HOME}` **once**, in Step 0, and record the resulting absolute path in the
manifest as `journal_root`. Every later step uses that recorded value verbatim.

This is not fussiness. `~` and `/tmp` resolve to different places depending on which
tool asks — Write and Edit see one path, Bash another — and a git worktree resolves
any repo-relative path to a different, empty directory. Resolving once and recording
the answer removes the whole class of bug.

The journal is **outside the repository** and is never deleted. These artifacts stop
being planning scratch the moment implementation begins: `it-codes.json` is what QA
reads to design scenarios weeks later, and `00-skeleton.md` holds the dependency
graph the tech lead orders work by. See `.claude/shared/run-journal.md`.

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

## Gate 3 → Freeze A (Build Lock)

Once Step 3 begins:

* Step 2 outputs are immutable
* Test Intent Maps cannot change
* no new sub-issues may be introduced
* UI state cannot be re-evaluated

## Gate 4 → Freeze B (IT Codes)

Once Step 3.7 completes:

* `it-codes.json` is immutable
* no IT code may be added, removed, renumbered or reworded
* every epic acceptance criterion carries at least one IT code

Freeze A and Freeze B are separate because IT codes are derived **after** Step 3
has produced each sub-issue's API contract and Page Architecture. Folding them into
one gate would either freeze the codes before the interface they describe exists, or
leave Step 2 mutable long after decomposition was settled.

## Gate 5 → Approval Complete

GitHub creation only occurs if:

* ALL eligible sub-issues are approved
* `it-codes.json` is approved

---

# 0) Resume / Initialize

The journal root is keyed by **milestone number**, not epic number, because every
downstream consumer — the milestone branch, `close-milestone`, the run loop — thinks
in milestones. So the milestone must be known before the journal can be located.

1. Fetch the epic and its assigned milestone:
   `gh issue view {epic_issue_number} --json title,body,milestone`
2. Derive `milestone_number` from the **assigned milestone's own title**. If the epic
   has no milestone assigned, stop and ask the user to assign one on GitHub first.
   Never parse a tag out of the epic's title text.
3. Resolve `{HOME}` to an absolute path and derive
   `journal_root = {HOME}/.claude/runs/panorama-music/m{milestone_number}`.

If `journal_root/manifest.json` exists:

* load it
* ask: Resume or restart milestone plan?

If restart:

* **rename** the existing directory to `m{milestone_number}.superseded-{n}`, choosing
  the lowest `n` not already taken — never delete it. A restart discards a plan, not
  the record that the plan existed; when the second attempt raises the same question
  the first one answered, that record is the only place the answer survives.
* reinitialize

Record `epic_issue_number`, `milestone_number` and `journal_root` in the manifest
before doing anything else.

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

* `milestone_title`: from the milestone already fetched in Step 0. Used only for
  the `--milestone` flag when creating sub-issues in Step 4 — sub-issue titles
  never carry a milestone tag.
* `acceptance_criteria`: the numbered prose criteria between `<!-- AC_START -->`
  and `<!-- AC_END -->` in the epic's `## Acceptance Criteria`. Record each with
  its `AC{n}` identifier and its text.

Store into manifest.

### Epic format check (HARD GATE)

The epic must be in the derived-IT-code format: an `AC_START`/`AC_END` block
containing numbered prose criteria and **no** IT codes.

Stop and report if either of these holds:

* **No `AC_START` marker.** The epic is not in the required format. Do not append a
  marker block around whatever is there — if IT codes were written by hand, their
  granularity has already been decided, and wrapping them would silently mix two
  schemes. Ask the user to bring the epic in line with the template first.
* **Markers present but IT codes already inside them.** Either the epic was authored
  by hand against the wrong instructions, or §3.7 has already run against it. Report
  what was found and ask which it is; do not proceed on a guess.

A criterion with no text, or criteria that are not numbered `AC1`, `AC2`, …, is also
a stop: §3.7 maps every derived code back to a criterion by that identifier, and it
cannot do so if the identifiers are missing or duplicated.

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
{journal_root}/00-skeleton.md
```

This file is the ONLY source of truth for sub-issue structure. It must record,
per sub-issue:

* Proposed title (without milestone prefix yet)
* Proposed labels — chosen **only** from labels that already exist in the
  repository. Run `gh label list --json name` and take the label set of two or
  three comparable recent issues (`gh issue list --state all --json
  number,title,labels`) as the pattern to follow; match their granularity
  rather than inventing a coarser umbrella name. Step 4 refuses to create
  labels, so a name invented here becomes a blocked hand-off later.
* Blocking relationships / dependencies
* Whether it has testable behaviour (or is flagged empty)

---

## 2.2 Test Intent Map (SOURCE OF TRUTH)

For each sub-issue, create:

```
{journal_root}/issues/{id}/test-intents.json
```

This is the ONLY definition of behaviour.

It contains:

* UC codes
* GIVEN / WHEN / THEN
* `covers_acs` — the epic criteria this sub-issue contributes to

Derive one or more `[UC_CODE]` criteria using the placeholder form
`{ISSUE}UC{n}` (e.g. `{ISSUE}UC1`, `{ISSUE}UC2`) per epic AC this sub-issue
contributes to — `{ISSUE}` is resolved to this sub-issue's real issue number
in Step 4, once the issue exists. Each criterion maps to exactly one
verifiable behaviour. When a sub-issue spans both backend and frontend, group
entries under `backend` and `frontend`. If the sub-issue was flagged as
having no testable behaviour, this file contains an empty criteria set.

**IT codes are not recorded here and do not exist yet.** They are derived in
Step 3.7, once drafting has produced the API contract and Page Architecture that
give them their granularity. What this file records instead is `covers_acs`: the
list of epic criterion identifiers (`AC1`, `AC2`, …) this sub-issue contributes
to, taken from the epic's `AC_START` block.

`covers_acs` is the join between decomposition and IT derivation. Step 3.7 reads
it to decide which sub-issue each derived code belongs to; without it, codes
could only be mapped by re-reading every draft and guessing.

A sub-issue with an empty criteria set may still have a non-empty `covers_acs` —
config-only or scaffolding work can contribute to a criterion without producing
unit-testable behaviour of its own.

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

* store in `{journal_root}/issues/{id}/ui.md`
* set ui_resolved = true

---

## 2.4 Step 2 Completion Rule (HARD GATE)

Step 2 is COMPLETE ONLY IF:

* 00-skeleton.md exists
* all test-intents.json files exist
* every epic criterion appears in at least one sub-issue's `covers_acs`
* all UI-required issues are either:

  * ui_resolved OR excluded

The coverage check is deliberately here rather than only at §3.7. A criterion no
sub-issue claims is a **decomposition** gap, and decomposition is still cheap to
change at this point. Discovering the same gap at §3.7 means the drafting in Step 3
was done against an incomplete plan.

If a criterion is unclaimed, do not invent a sub-issue to satisfy the check. Report
which criteria are uncovered and resolve it with the user — the honest outcomes are
a missing story, a criterion that belongs to a later milestone, or a criterion the
epic should not have made.

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

* {journal_root}/00-skeleton.md
* {journal_root}/issues/*/test-intents.json
* {journal_root}/issues/*/ui.md
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
{journal_root}/issues/{id}/
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
| Epic Reference | `#{epic_issue_number}`; Work Areas copied verbatim from epic AWA |
| Test Specifications | The literal placeholder `{IT_CODES}` on its own line |
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

### Why Test Specifications is a placeholder

IT codes do not exist yet. They are derived in Step 3.7 **from** the API contract
and Page Architecture this step is producing, so they cannot be rendered into a
draft that has not been written.

Writing `{IT_CODES}` and resolving it in Step 4 keeps `final.md` genuinely final:
approved drafts are never edited afterwards. It is the same mechanism as `{ISSUE}`,
which Step 4 already resolves the same way, for the same reason.

Do not attempt to guess codes here, and do not omit the placeholder — Step 4 refuses
to create an issue whose body still contains an unresolved placeholder, which is what
catches a draft that skipped this rule.

---

## 3.5 Approval Loop

Drafts are reviewed **on disk, never pasted into the conversation**. Issue
bodies run to hundreds of lines; echoing each revision of each sub-issue burns
the context this workflow needs for the phases that follow.

For each sub-issue:

1. Write the full snapshot to `issues/{id}/draft-vN.md` **before** saying
   anything about it.
2. Give the user the absolute path to that file and ask:

   > "Does this look correct, or do you have changes?"

3. Alongside the path, add a short summary — a few lines at most:
   * what the story covers, in one sentence
   * any judgement call worth the user's attention: an assumption made where
     the inputs were silent, a conflict found between the inputs and the
     current source, or a place where a design reference and the brief
     disagree
   * nothing else — no section-by-section recap, no restating requirements
     that are in the file

Never render the drafted body, or excerpts of it, into the conversation. If
the user asks about a specific part, answer the question rather than quoting
the section back.

Wait for the user's response, then proceed according to one of:

### APPROVE

* promote current draft to final.md
* mark approved in manifest
* confirm: "Draft for [Feature] {title} approved and stored."
* move to the next sub-issue

### MODIFY

* incorporate all feedback
* generate a new full snapshot version, stored as `draft-vN.md`
* propagate the feedback to every artifact it touches, not just the draft in
  hand — `00-skeleton.md`, the affected `test-intents.json`, `ui.md`, and any
  later sub-issue carrying the same assumption. A role change, a renamed
  screen, or a new filter is rarely confined to one file.
* re-present per the numbered steps above: path plus a short note naming only
  what changed
* repeat 3.5 until approved

### CLARIFY

* ask one question
* no file changes

### Verifying a suggestion before adopting it

When the user proposes a technical approach, check it against the current
source before writing it into a draft. If the codebase already settles the
question, say so with the evidence — file and line — recommend the option
that matches what is there, and let the user decide. Adopting a suggestion
that quietly contradicts an established convention costs more to unwind later
than the question costs to ask now.

---

## 3.6 Step 3 Completion Rule

Step 3 is complete only when:

* all eligible issues have final.md

---

## 3.7 IT Code Derivation (SOURCE OF TRUTH FOR E2E)

This step exists because IT codes written at epic-authoring time are guesses. They
are made before decomposition, before the API contract, and before any screen — so
they land at the wrong granularity and map awkwardly onto the stories that end up
delivering them.

Here, all three exist. A code derived now can name a real endpoint, a real screen and
a real role.

### 3.7.0 Input contract (CRITICAL)

This step may ONLY use:

* the epic's `AC_START` block — the numbered prose criteria, from the manifest
* {journal_root}/00-skeleton.md
* {journal_root}/issues/*/test-intents.json — specifically `covers_acs`
* {journal_root}/issues/*/final.md — the API contract and Page Architecture
* {journal_root}/issues/*/ui.md

NO OTHER INPUTS ARE ALLOWED. In particular, **do not read the application source**.
Codes derived from what the code already does describe the present, not the intent.

### 3.7.1 Derivation

Work **criterion by criterion**, not story by story.

For each epic criterion `AC{n}`:

1. Identify the sub-issues whose `covers_acs` includes it.
2. Read their API contracts and Page Architecture.
3. Decompose the criterion into the distinct end-to-end behaviours that would have
   to hold for it to be true — including the meaningful negative and boundary cases,
   not only the happy path.
4. Assign each one a code `{epic_issue_number}IT{n}`, numbered sequentially across
   the whole epic, and attach it to exactly one sub-issue.

Deriving criterion-first rather than story-first is what keeps the codes anchored to
the epic. Walking the stories instead would produce codes describing what was
planned, which can only ever cover what decomposition already thought of — the
coverage gate below would then be checking the plan against itself.

Granularity: one code per behaviour a single Playwright spec can prove. A criterion
that reads as one sentence but spans six meaningful states earns six codes. That
splitting is the point of this step.

**IT codes are always E2E.** They are proven by Playwright and nothing else. Never
derive an IT code for behaviour that only a unit test could observe — that is what UC
codes in `test-intents.json` are for.

### 3.7.2 Output

```
{journal_root}/it-codes.json
```

Per code: the code, the `AC{n}` it serves, the owning sub-issue id, and its
GIVEN / WHEN / THEN text in the exact wording that will appear in both the epic and
the sub-issue.

### 3.7.3 Coverage gate (HARD)

**Every epic criterion must carry at least one IT code.**

A criterion with none is a planning error and stops this step. Do not satisfy the
gate by inventing a code — report which criteria are uncovered and resolve it with
the user. By this point the honest causes are narrow: a criterion that describes
something no story actually delivers, or one whose behaviour is not observable
end-to-end and should not have been an epic criterion.

Also verify, and stop on any failure:

* every code is attached to exactly one sub-issue
* every referenced sub-issue exists in `00-skeleton.md` and was not excluded by §3.1
* codes are sequential with no gaps or duplicates
* no code duplicates the wording of another

### 3.7.4 Approval loop

Reviewed **on disk, never pasted into the conversation** — same rule and same reason
as §3.5.

1. Write `it-codes.json` before saying anything about it.
2. Give the user its absolute path, plus a short summary: how many codes, how they
   distribute across criteria and stories, and any judgement call worth attention —
   a criterion you split much further than its wording suggested, a negative case you
   added that the epic did not imply, a code you found hard to attach to a single
   story.
3. Wait. Then APPROVE, MODIFY or CLARIFY exactly as §3.5 defines.

On MODIFY, rewrite the whole file — it is small enough that a full rewrite is safer
than a patch, and partial edits are how numbering drifts.

### 3.7.5 Completion rule → Freeze B

Step 3.7 is complete only when `it-codes.json` exists, passes 3.7.3, and is approved.

At that moment **Gate 4 (Freeze B)** closes: codes may not be added, removed,
renumbered or reworded. Any later disagreement with a code is an escalation during
implementation, never a quiet edit here.

---

# 4) GitHub Creation Phase

Only after Gate 5 — every eligible sub-issue approved **and** `it-codes.json`
approved:

* **Pre-flight: verify every planned label already exists on GitHub.**
  * Collect every unique label across the sub-issues from `00-skeleton.md`.
  * Run `gh label list --json name` and parse the existing labels.
  * Every planned label must match an existing one exactly. A label that does
    not exist is a planning error, not a gap to fill — it almost always means
    a coarser or invented name was chosen over the taxonomy the repo already
    uses (e.g. a single `layer: backend` where the repo distinguishes
    `layer: domain`, `layer: application`, `layer: api`, `layer: db`,
    `layer: infrastructure`).
  * On any mismatch, stop and resolve it with the user before creating
    anything: show the unmatched label alongside the closest existing labels
    and the sets used by comparable recent issues, and recommend a
    replacement drawn from what exists. Never run `gh label create` on your
    own initiative — create a label only if the user explicitly asks for it.
  * Correct `00-skeleton.md` and the manifest to the agreed labels before
    proceeding, so the artifacts match what is actually applied.
* Create issues via `gh issue create` — iterate over the `final.md` bodies in
  order:
  * Run `gh issue create` with `--title`, `--milestone "{milestone_title}"`
    (from Step 1 — omit the flag entirely if the epic has none), `--label`,
    `--body-file`.
  * Verify the exit code. If creation fails, notify the user with the error
    output and stop.
  * On success, capture the created issue number.
  * **Resolve placeholders** — both, in one edit:
    * `{ISSUE}` → the real issue number. This only ever affects UC codes; IT
      codes carry the epic's number and never need substitution.
    * `{IT_CODES}` → under `## Test Specifications`, the checkbox lines for the
      codes `it-codes.json` attaches to this sub-issue, rendered as
      `- [ ] \`{code}\` GIVEN … WHEN … THEN …` using the wording from
      `it-codes.json` verbatim, in code order. A sub-issue with no codes attached
      gets `N/A` in place of the placeholder — the section is never deleted, so
      QA always finds it.
    Then run `gh issue edit {number} --body-file` with the patched body. Verify
    the exit code; if the edit fails, notify the user with the error output and
    stop — never leave an issue with an unresolved placeholder in its body.
  * **Verify no placeholder survives.** Re-read the body after the edit and
    confirm it contains neither `{ISSUE}` nor `{IT_CODES}`. An issue that ships
    with a live placeholder is worse than one that failed to create: it looks
    complete, and the missing IT codes mean QA has nothing to design against.
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

# 6) Epic Safe Patch

Two marker blocks are patched, under the same discipline but with **opposite
ownership**. `AWA_START` is entirely tool-owned. `AC_START` is user-owned: the
criteria inside it were authored by hand and this step only inserts code lines
beneath them.

---

## 6.1 AWA block

Locate:

```
/<!-- AWA_START -->(.*?)<!-- AWA_END -->/
```

Rules:

* modify only inside markers
* idempotent inserts
* no reordering
* no deletions
* never uncheck or remove existing checked items

Entry format:

```
- [ ] [Feature] Title (#{number})
```

Missing block — append:

```
## Anticipated Work Areas

<!-- AWA_START -->
<!-- AWA_END -->
```

---

## 6.2 AC block — IT code insertion

Locate:

```
/<!-- AC_START -->(.*?)<!-- AC_END -->/
```

Insert each code from `it-codes.json` as a checkbox nested beneath the criterion it
serves, in code order:

```
**AC1.** An admin can enrol a student in a course.
- [ ] `45IT1` GIVEN a course with capacity WHEN an admin enrols a student THEN the student is enrolled
- [ ] `45IT2` GIVEN a student already enrolled WHEN an admin enrols them again THEN it is rejected
```

The `- [ ] \`{code}\` …` shape is not cosmetic: `close-milestone` finds and ticks
codes by exactly this pattern. A code rendered any other way is a code that will
never be ticked.

Rules:

* modify only inside markers
* **never** edit, reword, renumber or reorder a criterion — only insert beneath it
* idempotent: a code already present is left alone, not duplicated
* never uncheck or remove an existing checked code
* wording comes from `it-codes.json` verbatim, so the epic and the sub-issue carry
  identical text for the same code

Missing block — **stop**. Do not append one. §1's format check should already have
caught this; reaching here means the epic changed underneath the run, and wrapping
whatever is now in `## Acceptance Criteria` risks silently enclosing hand-authored
IT codes in a block this step then writes into.

---

## 6.3 Atomic update

Both blocks are patched in a **single** `gh issue edit`. Two edits leave a window in
which the epic lists stories whose criteria carry no codes, and an interruption
inside that window is indistinguishable from a derivation that produced nothing.

---

# 7) Hand-off (NO CLEANUP)

The journal is **never** deleted. Planning does not end this milestone's life — it
starts it, and these artifacts are inputs to everything that follows:

* `it-codes.json` — what QA reads to design E2E scenarios, per story, for weeks
* `00-skeleton.md` — the dependency graph the tech lead orders work by
* `issues/*/final.md` — the drafted intent behind each issue body
* `manifest.json` — what a resumed run reconciles against GitHub

Confirm the journal root to the user as the hand-off point, and record in the
manifest that planning is complete.

---

# 8) Final Output

Return:

* total issues created
* issue list (number + URL)
* IT code count, and its distribution across epic criteria
* epic update confirmation (both marker blocks)
* journal root path
