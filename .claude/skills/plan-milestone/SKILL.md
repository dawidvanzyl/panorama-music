---
name: plan-milestone
description: >
  Load this skill when the user says "plan milestone", "plan-milestone", or
  "/plan-milestone". Derives sub-issues for a milestone epic, persists all
  artifacts to disk, requires a design mockup for every UI story, and creates GitHub
  issues only after full approval.
license: MIT
metadata:
  audience: maintainers
  workflow: github-issues
---

# Core Principle

Every step reads its inputs from, and writes its outputs to, the milestone's **run
journal**, never conversational memory. Its location, layout, manifest and write rules
are defined in `.claude/shared/run-journal.md`.

A step never modifies an earlier step's output, except through user feedback in an
approval loop (§3.3 MODIFY).

# Freezes

* **Freeze A** — from the start of Step 3, `00-skeleton.md`, the sub-issue set,
  `test-intents.json` and UI state are not changed on your own initiative. It stops
  drafting from quietly re-planning. User feedback in §3.3 may still amend them; an
  amendment you think is needed but the user has not asked for is raised as a
  question, never applied.
* **Freeze B** — once §3.4 is approved, IT codes may not be added, removed,
  renumbered or reworded. Later disagreement is an escalation during implementation.

They are separate because IT codes are derived *from* the API contracts and Page
Architecture that Step 3 produces: one gate would freeze codes before their interface
exists, or leave decomposition mutable long after it was settled.

---

# 0) Resume / Initialize

1. `gh issue view {epic_issue_number} --json title,body,milestone`
2. Derive `milestone_number` from the **assigned milestone's own title** — never from
   the epic's title text. No milestone assigned → stop and ask the user to assign one.
3. Resolve `journal_root` to an absolute path, per run-journal.md.

If `{journal_root}/manifest.json` exists, load it and ask: resume or restart? On
restart, rename the directory to `m{milestone_number}.superseded-{n}` (lowest free
`n`) and reinitialize.

Record `epic_issue_number`, `milestone_number` and `journal_root` in the manifest
before anything else.

---

# 1) Read Context (read only)

Read:

* the epic (from Step 0)
* `.github/ISSUE_TEMPLATE/sub-issue.md` — authoritative structure for every draft;
  if missing, stop and tell the user
* `docs/coding-standards.md`, `docs/coding-standards-backend.md`,
  `docs/coding-standards-frontend.md`, `src/.editorconfig`, `frontend/.editorconfig`
  — for domain conventions, naming and layer boundaries (not implementation steps)
* architectural decisions or constraints established earlier in the session

Record in the manifest:

* `constraints` — what drafting needs from the sources above, the material for
  `## Context & Constraints` and `## Domain & Data`. Step 3 reads this instead of
  the docs.
* `milestone_title` — used only for `--milestone` in Step 4; sub-issue titles never
  carry a milestone tag.
* `acceptance_criteria` — each `AC{n}` and its text, from between `<!-- AC_START -->`
  and `<!-- AC_END -->`.

### Epic format check (hard stop)

The AC block must contain numbered prose criteria (`AC1`, `AC2`, … — each with text,
none duplicated) and **no** IT codes. Stop and report if:

* **there is no `AC_START` marker** — do not wrap whatever is there; hand-written IT
  codes inside would silently mix two schemes. Ask the user to fix the epic.
* **IT codes are already inside the markers** — either hand-authored against the
  wrong instructions, or §3.4 already ran. Ask which; don't guess.
* **criteria are unnumbered, empty or duplicated** — §3.4 maps every code back by
  that identifier.

---

# 2) Plan Phase

Produces only structured journal artifacts — no GitHub issues and no issue markdown.
G/W/T is recorded here as structured data; rendering it waits for Step 3.

## 2.1 Decomposition → `00-skeleton.md`

Plan the sub-issues that fully deliver the criteria:

* **Behaviour, not layer.** A story is a cohesive user- or system-facing behaviour
  and carries both its API and its screen. No backend-only/frontend-only split, no
  separate "test" sub-issues (testing AWAs in the epic are informational). Layer-based
  stories only when the epic is pure technical scaffolding.
* **Dependencies** — which stories must land before others.
* **Does the gap still exist?** Grep the codebase before a criterion or finding
  becomes planned work; earlier milestones sometimes deliver part of an epic. If it
  exists, report file and line and let the user decide what the criterion now means.
* **Scope.** If a criterion, or something a mockup shows, looks like it belongs
  outside this milestone, ask. Never defer or trim it on your own — silently deferred
  requirements resurface half-built.
* **Testability** — given a state, when an action occurs, what outcome is
  guaranteed? Config-only, dependency or pure scaffolding work is flagged as having
  empty criteria.

`00-skeleton.md` is the only source of sub-issue structure. Per sub-issue it records
title (no milestone prefix), labels, dependencies, testability flag, and scope
boundaries.

**Labels** come only from labels that already exist: run `gh label list --json name`
and follow the label sets of two or three comparable recent issues (`gh issue list
--state all --json number,title,labels`), matching their granularity rather than
inventing an umbrella name. Step 4 refuses to create labels.

## 2.2 Test Intent Map → `issues/{id}/test-intents.json`

The only definition of a sub-issue's unit-testable behaviour:

* **UC criteria** — one or more per epic AC the sub-issue contributes to, coded
  `{ISSUE}UC{n}` (`{ISSUE}` resolves in Step 4), each with GIVEN / WHEN / THEN and
  mapped to exactly one verifiable behaviour. Grouped `backend` / `frontend` when the
  story spans both; empty if flagged in 2.1.
* **`covers_acs`** — the `AC{n}` identifiers this sub-issue contributes to. This is
  the join §3.4 uses to attach IT codes to stories. It may be non-empty even when the
  criteria set is empty (scaffolding can contribute without unit-testable behaviour).

IT codes are not recorded here — they don't exist until §3.4.

## 2.3 UI Audit

Record in `00-skeleton.md`:

| AC | Human Interaction? | Screen Required | Sub-Issue |
|---|---|---|---|

For each criterion ask: does a human interact with the system to satisfy it? Admins
are humans; out-of-band delivery (email, SMS) still needs a screen to trigger it. A
sub-issue behind any screen-requiring AC gets `layer: frontend` alongside its other
labels, and a draft Page Architecture (screen description, component hierarchy as a
mermaid flowchart, interaction flow as a sequence diagram). Mark it
`ui_blocked = true`.

### Resolving the UI gate

Every UI-blocked story needs a mockup, but where it comes from doesn't matter. Ask the
user for one — produced by any tool — dropped into `.design/<screen_name>.txt` (short
snake_case) at the repo root, or the name of an existing file there. `.design/` is
gitignored on purpose: disposable scaffolding, kept out of history but cited as visual
ground truth. If an export is packed (a self-unpacking HTML bundle, a `.zip`), unpack
it before reading, since packed text isn't greppable.

**The mockup is authoritative.** Every control, filter, copy string, validation
message and blocked action it shows is a requirement; where it and the epic disagree,
the mockup governs and the difference is in scope. Design only from the file(s) the
user names — never blend in a sibling. Where it is silent, ask.

Then write `issues/{id}/ui.md` (the `.design/` path(s), a line on what each shows, and
the Page Architecture revised to match) and set `ui_resolved = true`. If the user
proceeds without a mockup, record the sub-issue as excluded in the manifest; never
invent one.

## 2.4 Completion gate (hard)

Step 3 may begin only when `00-skeleton.md` and every `test-intents.json` exist, every
UI-blocked sub-issue is resolved or excluded, and **every criterion appears in at
least one `covers_acs`**.

The coverage check lives here because an unclaimed criterion is a decomposition gap,
still cheap to fix. Don't invent a sub-issue to pass it — report the gap; the honest
outcomes are a missing story, a criterion for a later milestone, or one the epic
should not have made.

---

# 3) Build Phase

## 3.1 Inputs

Only: the manifest (`epic_issue_number`, `constraints`), `00-skeleton.md`,
`test-intents.json`, `ui.md` and the `.design/` files it names, and the sub-issue
template. Sub-issues that are UI-blocked and unresolved are excluded from Step 3
entirely.

## 3.2 Drafting

Each draft is a full snapshot at `issues/{id}/draft-vN.md`, following the template
section for section. Bodies describe what and why — never file paths, function
signatures or implementation steps.

| Template section | Source |
|---|---|
| Title | `[Feature] {title}` |
| Overview | The behaviour grouping in `00-skeleton.md` |
| Epic Reference | `#{epic_issue_number}`; Work Areas: `- [ ] [Feature] {title} (#{ISSUE})` — the exact line §6.1 inserts in the epic |
| Test Specifications | The literal placeholder `{IT_CODES}` on its own line |
| Context & Constraints | Manifest `constraints`; known constraints; related issues; frontend: a `**Design reference:** \`.design/<file>.txt\`` bullet per mockup in `ui.md` |
| Functional Requirements | Observable behaviours only |
| Domain & Data | Entities, relationships, business rules — no schema or column types |
| API / Interface Contract | Endpoints, events/side-effects, UI entry points |
| Page Architecture | `layer: frontend` only — the same Design reference bullet(s), then `ui.md` |
| Acceptance Criteria (G/W/T) | Rendered from `test-intents.json`, `### Backend` / `### Frontend` if both; empty if the criteria set is empty |
| Out of Scope | Scope boundaries from `00-skeleton.md`; deferred work by `#issue` or milestone |

The Design reference appears twice because the implementer reads Context &
Constraints and the QA plan reads Page Architecture.

`{IT_CODES}` exists because IT codes are derived in §3.4 *from* these drafts; Step 4
resolves it (like `{ISSUE}`), so an approved `final.md` is never edited afterwards.
Never guess codes or omit the placeholder.

## 3.3 Approval loop

Review happens **on disk**; issue bodies run to hundreds of lines and pasting them
burns context the later phases need.

1. Write the draft file before saying anything about it.
2. Give its absolute path and ask: "Does this look correct, or do you have changes?"
3. Add at most a few lines: what the story covers in one sentence, and any judgement
   call worth attention (an assumption where inputs were silent, a conflict with the
   current source, a mockup/brief disagreement). No recap. Never render the body or
   excerpts; answer questions about it directly.

Then:

* **APPROVE** — promote the draft to `final.md`, mark approved in the manifest,
  confirm "Draft for [Feature] {title} approved and stored.", move on.
* **MODIFY** — write a new full `draft-vN.md` and propagate the feedback to every
  artifact it touches (`00-skeleton.md`, `test-intents.json`, `ui.md`, later drafts
  sharing the assumption) — this is the only Freeze A exception. Log each upstream
  amendment in the manifest (artifact, change, cause). If it touches an approved
  sub-issue, tell the user and re-open it as a new draft; never edit a `final.md` in
  place. Re-present with a note naming only what changed.
* **CLARIFY** — ask one question, change no files.

When the user proposes a technical approach, check it against the current source
first. If the codebase already settles it, cite file and line, recommend the option
that matches, and let the user decide.

Step 3 drafting is complete when every eligible sub-issue has a `final.md`.

## 3.4 IT Code Derivation → `it-codes.json`

IT codes written at epic-authoring time are guesses made before decomposition,
contracts or screens. Now all three exist, so codes can name real endpoints, screens
and roles.

**Inputs:** `acceptance_criteria` from the manifest, `00-skeleton.md`, `covers_acs`,
each `final.md`'s API contract and Page Architecture, and `ui.md`. **Do not read the
application source** — codes derived from existing code describe the present, not the
intent.

**Derive criterion by criterion**, not story by story — walking stories would only
cover what decomposition already thought of, and the coverage gate would check the
plan against itself. For each `AC{n}`:

1. Take the sub-issues whose `covers_acs` includes it and read their contracts and
   Page Architecture.
2. Split the criterion into the distinct end-to-end behaviours that must hold,
   including meaningful negative and boundary cases.
3. Code each `{epic_issue_number}IT{n}`, numbered sequentially across the epic, and
   attach it to exactly one sub-issue.

One code per behaviour a single Playwright spec can prove: one sentence spanning six
meaningful states earns six codes. IT codes are E2E only — behaviour only a unit test
can observe belongs in UC codes.

Per code record: code, `AC{n}`, owning sub-issue id, and GIVEN / WHEN / THEN in the
exact wording used in both epic and sub-issue.

**Gate (hard stop on any failure):**

* every criterion carries at least one code — if not, report it; don't invent a
  code. The cause is a criterion no story delivers, or one not observable end-to-end.
* every code is attached to exactly one sub-issue, which exists and was not excluded
* numbering is sequential with no gaps or duplicates, and no two codes share wording

**Approval:** as §3.3 — write the file first, then give its path with the code count,
distribution across criteria and stories, and any judgement call (a criterion split
far beyond its wording, an added negative case, a code hard to attach). On MODIFY,
rewrite the whole file; partial edits are how numbering drifts. Approval closes
Freeze B.

---

# 4) GitHub Creation

Only once every eligible sub-issue and `it-codes.json` are approved.

**Label pre-flight.** Every label in `00-skeleton.md` must exactly match one from
`gh label list --json name`. A mismatch is a planning error — usually a coarser
invented name where the repo distinguishes finer ones (e.g. `layer: backend` vs
`layer: domain` / `application` / `api` / `db` / `infrastructure`). Stop, show the
unmatched label beside the closest existing ones and the sets on comparable issues,
and recommend a replacement. Run `gh label create` only if the user explicitly asks.
Correct `00-skeleton.md` and the manifest to the agreed labels.

**Per `final.md`, in order:**

1. `gh issue create --title … --milestone "{milestone_title}" --label … --body-file …`
   (omit `--milestone` if the epic has none). On failure, report the error and stop.
2. Resolve placeholders in one `gh issue edit {number} --body-file`:
   * `{ISSUE}` → the new number (UC codes and the Work Areas line; IT codes carry
     the epic's number).
   * `{IT_CODES}` → this sub-issue's codes from `it-codes.json`, in code order, as
     `- [ ] \`{code}\` GIVEN … WHEN … THEN …` verbatim; `N/A` if it has none — the
     section is never deleted, so QA always finds it.
   On failure, report and stop.
3. Re-read the body and confirm neither placeholder survives — a live placeholder
   looks complete but leaves QA nothing to design against.
4. Confirm "Created #{number}: {title}" and store number + URL in the manifest.

---

# 5) Linking

The REST API returns 404 for sub-issue linking; use GraphQL.

1. Fetch node IDs in one query:
   ```
   gh api graphql -f query='{ repository(owner: "OWNER", name: "REPO") {
     epic: issue(number: EPIC) { id }
     i1: issue(number: N1) { id }
     ...
   } }'
   ```
2. Per sub-issue:
   ```
   gh api graphql -f query='mutation {
     addSubIssue(input: {issueId: "PARENT_ID", subIssueId: "CHILD_ID"}) {
       issue { number } subIssue { number }
     }
   }'
   ```

If GraphQL fails, fall back to a comment on the epic listing the sub-issues.

---

# 6) Epic Patch

Both blocks are patched in a **single** `gh issue edit` — two edits leave a window
where the epic lists stories whose criteria carry no codes, indistinguishable from a
derivation that produced nothing.

Shared rules for both: modify only inside the markers; inserts are idempotent (never
duplicate what is present); never reorder, delete, or uncheck an existing item.

## 6.1 AWA block (tool-owned) — `<!-- AWA_START -->…<!-- AWA_END -->`

Insert `- [ ] [Feature] {title} (#{number})` per sub-issue. If the block is missing,
append:

```
## Anticipated Work Areas

<!-- AWA_START -->
<!-- AWA_END -->
```

## 6.2 AC block (user-owned) — `<!-- AC_START -->…<!-- AC_END -->`

Insert each code beneath the criterion it serves, in code order, wording verbatim from
`it-codes.json`; never edit, reword, renumber or reorder a criterion:

```
**AC1.** An admin can enrol a student in a course.
- [ ] `45IT1` GIVEN a course with capacity WHEN an admin enrols a student THEN the student is enrolled
- [ ] `45IT2` GIVEN a student already enrolled WHEN an admin enrols them again THEN it is rejected
```

`close-milestone` finds and ticks codes by exactly this `- [ ] \`{code}\`` shape.

If the block is missing, **stop** — the epic changed underneath the run, and wrapping
what is there risks enclosing hand-authored IT codes.

---

# 7) Hand-off

The journal is never deleted: implementation runs from it. Record
`planning_complete: true` in the manifest, and report:

* issues created (number + URL)
* IT code count and its distribution across criteria
* epic update confirmation (both blocks)
* journal root path
