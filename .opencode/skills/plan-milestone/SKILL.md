---
name: plan-milestone
description: >
  Load this skill when the user says "plan milestone", "plan-milestone", or
  "/plan-milestone". Derives a full set of sub-issues for a milestone epic,
  presents each one individually for approval, then creates and links them on
  GitHub and updates the epic with an Anticipated Work Areas checklist.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues
---

## Announcement

At the start of execution, always post a visible message to the user:

> "Loaded skill: **plan-milestone**. Starting milestone planning workflow..."

## Inputs

- `epic_issue_number`: the GitHub issue number of the milestone epic (e.g. `45`).

Optional:
- Repository owner/name if not inferable from git remote.

## Goal

Produce a fully-detailed, GitHub-linked set of sub-issues for a milestone epic,
with each sub-issue individually reviewed and approved by the user before it is
created. After all sub-issues are created, link them to the epic via GraphQL and
update the epic body with an Anticipated Work Areas checklist so the
`close-issue` skill can track completion.

## Guardrails

- **GitHub API and GraphQL only.** No local file edits, no branch creation, no
  commits, no shell commands other than `gh` CLI calls.
- **Never create a GitHub issue without explicit user approval of its full
  drafted body.**
- **Never modify the epic body** except to add or update the
  `Anticipated Work Areas` section.
- If the epic already has an `Anticipated Work Areas` section, append new
  entries rather than overwriting any already-checked items.
- Keep all communication concise and professional. No emojis.

## Procedure

### 0) Gather inputs

- If `epic_issue_number` was not provided, ask: "What is the epic issue number?"
- Do not proceed until the value is confirmed.

### 1) Read context

Fetch the following and internalize before drafting anything:

- Full body of the epic issue `#{epic_issue_number}` — title, description,
  milestone, labels.
- The milestone description from the GitHub milestone associated with the epic.
- The sub-issue template at `.github/ISSUE_TEMPLATE/sub-issue.md` — every
  sub-issue body must strictly follow this structure.
- Any architectural decisions, stack choices, naming conventions, or design
  constraints established earlier in the current session.
- The coding standards documents at `docs/coding-standards-backend.md` and
  `docs/coding-standards-frontend.md` — must be read before drafting any
  sub-issues.

Extract:
- `milestone_tag`: the short milestone identifier, e.g. `M0`, `M1`, `M0.2`.
  Derived from the epic title (e.g. `[Backlog] M1 — Identity & Auth` → `M1`).

### 2) Derive sub-issue skeleton plan

Reason about what sub-issues are needed to fully implement the milestone.
Consider:

- All layers affected (domain, application, infrastructure, API, frontend).
- Logical implementation order and blocking dependencies.
- Scope boundaries — what belongs in this milestone vs. a later one.
- Conventions from `docs/coding-standards-backend.md` and
  `docs/coding-standards-frontend.md` — naming, layer rules, file structure,
  migration patterns, component conventions.
- **Unit test reasoning per sub-issue:** for each derived sub-issue, think
  through what unit tests are needed to verify the implementation. Tests should
  target method/function/component granularity — one behavior per test. This
  reasoning directly drives the `Acceptance Criteria (G/W/T)` section in step
  3a. If a sub-issue produces no testable code (config changes, dependency
  updates, pure structural work), flag it as having empty criteria.
- For feature milestones (M1+): schema design, query strategies, API contracts,
  UI layouts, and implementation strategies must be reflected in the detail of
  each sub-issue.

### 2a) UI audit — identify required screens

Before presenting the skeleton to the user, audit every acceptance criterion
in the epic. For each AC, ask: "Does a human interact with the system to
satisfy this?"

Important distinctions the audit must apply:
- **An admin is a human.** If an AC says "Admin can create a user", the admin
  needs a screen to perform that action — even if the invite URL is delivered
  out-of-band.
- **A user is a human.** If an AC says "User can log in", the user needs a
  login screen.
- **"Out-of-band delivery"** refers to how a result reaches the human (email,
  SMS, etc.), but the human still needs a UI to trigger the action.
- **Do NOT create separate frontend-only sub-issues.** Each screen belongs in
  the same sub-issue as its backend implementation.

Document the audit as a table:

| AC | Human Interaction? | Screen Required | Sub-Issue |
|---|---|---|---|

Then:
- For each AC that requires a screen, ensure the sub-issue includes
  `layer: frontend` alongside its backend labels and a `Page Architecture`
  section in step 3a.
- Sub-issues with no human interaction keep their existing labels.

Produce an ordered list of sub-issues with:
- Proposed title (without prefix yet)
- Proposed labels
- Blocking relationships

Important: Do NOT create separate "test" sub-issues. Every feature sub-issue
contains its own tests — UC codes in `## Acceptance Criteria (G/W/T)` and IT
codes in `## Epic Reference > Acceptance Criteria`. Testing-related AWAs
copied from the epic are informational only and do not generate sub-issues.

Important: Do NOT create separate frontend-only sub-issues. Each screen must
be bundled with its backend implementation in a single sub-issue.

Present this skeleton plan to the user as an overview. State clearly:
> "This is the proposed plan. No issues will be created yet. I will now draft
> each sub-issue in full for your approval one at a time."

No approval is required at this stage — the user may request additions,
removals, or reordering before the detailed drafting begins. Incorporate any
changes, then proceed to step 3.

### 3) Draft and approve — one sub-issue at a time

For each sub-issue in the ordered list, repeat the following loop.
Creation is deferred until all sub-issues are drafted and approved
(see step 4).

#### 3a) Draft the full issue body

Generate the complete issue body strictly following the
`.github/ISSUE_TEMPLATE/sub-issue.md` structure:

- **Title**: prefixed with `[{milestone_tag}]`, e.g. `[M1] Domain entities — Users, UserRoles, RefreshTokens`
- **Overview**: one paragraph explaining what this issue implements and why it
  exists in the context of the milestone.
- **Epic Reference**:
  - Milestone link referencing `#{epic_issue_number}`
  - Anticipated Work Areas — copy matching AWA checkbox text verbatim from the
    epic's `## Anticipated Work Areas` section
  - Acceptance Criteria — only list IT codes that this sub-issue's scope
    directly contributes to. For example, a domain-entities sub-issue includes
    ACs that touch those entities; it does NOT include ACs about unrelated
    endpoints. Be selective, not exhaustive.
- **Scope**: explicit in-scope and out-of-scope bullets.
- **Implementation Plan**: step-by-step, layer-by-layer instructions detailed
  enough that no additional context is needed. Follow conventions from
  `docs/coding-standards-backend.md` and `docs/coding-standards-frontend.md`
  for file paths, naming, layer boundaries, and component structure.
  Include:
  - `### Files to Create` with `path/to/file` — purpose
  - `### Files to Modify` with `path/to/file` — what changes and why
  - For feature milestones: schema definitions, SQL queries, API route
    signatures, DTO shapes, UI component structure, and implementation strategy
    as applicable.
  - **Page Architecture** (only include for sub-issues with a `layer: frontend`
    label):
    - **Screen description:** one paragraph. What this screen shows, who uses
      it, and what their goal is when interacting with it.
    - **Component hierarchy:** a mermaid flowchart showing the component tree:
      ```mermaid
      flowchart TD
          ScreenName --> ComponentA
          ComponentA --> ComponentB
          ComponentB --> LeafComponent
      ```
    - **User interaction flow:** a mermaid sequence diagram showing the full
      user → component → API round-trip:
      ```mermaid
      sequenceDiagram
          User->>ComponentA: action description
          ComponentA->>API: HTTP request
          API-->>ComponentA: response
          ComponentA-->>User: visual update
      ```
- **Acceptance Criteria (G/W/T)**: translate the unit-test reasoning from step
  2 into GIVEN/WHEN/THEN format — derive one or more `[UC_CODE]` criteria (e.g.
  `M1UC1`, `M1UC2`) from each epic AC this sub-issue satisfies. Each criterion
  maps to exactly one unit test. When a sub-issue spans both backend and
  frontend layers, group criteria under `### Backend` and `### Frontend`
  subsections. If the sub-issue was flagged as having no testable code, this
  section is empty.
- **Dependencies**: blocked-by and must-merge-before relationships using issue
  numbers where known (use titles for issues not yet created in this run).
- **Notes**: constraints, prior decisions, or context the implementer needs to
  avoid going off-script.
- **Anticipated Work Areas**: this section does **not** appear in sub-issues —
  it belongs to the epic only.

#### 3b) Present for approval

Present the full drafted body to the user exactly as it will appear on GitHub.

Then ask:
> "Does this look correct, or do you have changes?"

Wait for the user's response. Do not proceed until one of the following:
- The user explicitly approves (e.g. "looks good", "yes", "approved", "create it").
- The user requests changes — incorporate all feedback, re-present the updated
  draft, and repeat 3b until approved.

#### 3c) Store the approved body

Once approved:
- Store the drafted body in memory along with its title, labels, and
  milestone number.
- Confirm to the user: "Draft for #{title} approved and stored."
- Do NOT create the issue on GitHub yet.

Then immediately move to the next sub-issue in the list.

### 4) Create all approved sub-issues

After all sub-issues have been drafted and approved:

- **Pre-flight: verify all labels exist on GitHub.**
  - Scan all stored sub-issue bodies and collect every unique label.
  - Run `gh label list --json name` and parse the existing labels.
  - For any missing label, notify and create it:
    `gh label create "<name>"`
- **Create issues** - iterate over the stored bodies in order:
  - Run `gh issue create` with `--title`, `--milestone`, `--label`,
    `--body`.
  - Verify the exit code. If creation fails, notify the user with the
    error output and stop.
  - On success, capture the created issue number.
  - Confirm to the user: "Created #{number}: {title}"
  - Maintain a running list of `{number, title, url}` for use in
    subsequent steps.

### 5) Link sub-issues to epic via GraphQL

After all sub-issues have been created:

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

### 6) Update epic with Anticipated Work Areas

Fetch the current body of the epic issue. Add or update the
`## Anticipated Work Areas` section with a checkbox for each created sub-issue:

```markdown
## Anticipated Work Areas

- [ ] [{milestone_tag}] Title of sub-issue (#{number})
- [ ] [{milestone_tag}] Title of sub-issue (#{number})
```

Rules:
- If the section does not exist, append it at the end of the epic body.
- If the section already exists, append new entries after the last existing
  entry. Never uncheck or remove existing checked items.

Update the epic body via `gh issue edit #{epic_issue_number} --body "..."`.

### 7) Summary

Post a summary to the user:

- Total sub-issues created
- List of issue numbers, titles, and URLs
- Confirmation that all sub-issues are linked to the epic
- Confirmation that the Anticipated Work Areas section has been updated in
  `#{epic_issue_number}`
