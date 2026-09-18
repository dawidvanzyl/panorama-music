---
name: implement-milestone
description: >
  Load this skill when the user says "implement milestone", "implement-milestone", or
  "/implement-milestone". Orchestrates the implementation of a planned milestone: selects
  the next sub-issue in dependency order, delegates each stage to a worker role,
  reconciles run state against GitHub, and merges stories into the milestone branch.
license: MIT
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Role

You are the tech lead: you orchestrate, you do not implement. The path guard refuses
edits to `src/`, `frontend/` and `e2e/` — delegate or escalate instead of routing
around it.

**Your context has to outlast the entire milestone.** Workers' contexts are
disposable; yours cannot be recreated cheaply. Spending it on an edit, a full report,
or a re-run a cheaper role or a label could have handled costs you a story later.

Two rules run through every step:

- **Update the manifest before acting, never after**, so a crash leaves it
  understating rather than overstating what happened.
- **Never invent an IT code or change a frozen artifact** — both are escalations.

## Inputs

- `milestone_number` — required; ask if not given.
- The journal at `{HOME}/.claude/runs/panorama-music/m{milestone_number}/` must exist
  with `planning_complete: true`. Otherwise stop: run `plan-milestone` first.

---

## Procedure

### 1) Resume: replay, then reconcile

Follow *Resume: replay, then reconcile* in `.claude/shared/run-journal.md`. For a
story caught mid-stage, read the interrupted worker's newest report (`plan-dev.md` /
`plan-open-issues.md`, `implement-{n}.md`, `qa-run-{n}.md` or `review-{n}.md`) to see
how far it got. A story at `awaiting-plan-approval` with `plans_approved` unset resumes
at the plan gate, not the planner.

Report where you are picking up in one line, then continue.

### 2) Select the next story

The tech lead's hard rules (`.claude/agents/tech-lead.md`) govern this loop: one step
at a time, and you own the order.

From `00-skeleton.md` and the manifest, pick a story that is not `merged` or `closed`
and whose `depends_on` issues are all closed, preferring the one unblocking the most
others. If none is eligible and none is in flight, the graph has a cycle or stalled
blocker — stop and report it.

### 3) Run the story

Each story runs these stages in order. Set `stage` in the manifest **before** you
spawn, then spawn with `subagent_type` = role and `run_in_background: true`.

| Stage | Role | Skill | Produces |
| --- | --- | --- | --- |
| `planning` | `planner` | `plan-implementation` | `plan-dev.md`, `plan-qa.md` |
| `critiquing` | `plan-critique` | `plan-critique` | `plan-open-issues.md` |
| `awaiting-plan-approval` | — (owner) | — | `plans_approved` |
| `implementing` | `developer` | `implement-issue` | the PR |
| `testing` | `qa-implement` | `qa-implement` | `gate: qa-complete` |
| `reviewing` | `reviewer` | `review-pull-request` | `gate: reviewer-approved` |

**Always background:** only background subagents can `SendMessage` to `main`, and you
couldn't read it while blocked anyway — a foreground worker turns every escalation into
"give up and report".

**One agent per role per story, kept warm.** Spawn each role once. For every rework or
revision — a critique sending the plan back, a bug or finding sending the developer
back — resume the *same* agent by name with `SendMessage`; it already holds the context
a fresh spawn would burn tokens re-deriving. Start fresh agents only on the next story.

**The brief** (per `.claude/shared/subagent-contract.md`) is named inputs plus one
sentence of intent, rulings cited by number — never a narrative, which drifts between
retellings so a respawned worker silently gets a different task. Always include
`issue_number`, `journal_dir` (absolute), `base_branch` (the milestone branch),
`mode: subagent` and `outcome`, plus role inputs. `plan` and `plan-critique` have no
shell, so first write `issue_body_file`, `epic_body_file`, `it_codes_file` and
`test_intents_file` into the story's `journal_dir`; the `planner` writes both plans and
`plan-critique` writes `plan-open-issues.md`, all in that dir; the developer gets
`dev_plan_file` (and `plan_open_issues_file` whenever open non-blocker findings remain,
to honour or disposition), `qa-implement` gets `qa_plan_file`, and the reviewer gets
`cycle` (the story's `attempts.review`).

End every brief with the same two lines: create your report file before starting work,
and commit as you go. They are in the contract too, but a rule stated only in a shared
doc is one a worker under turn pressure skips.

**Read the verdict line only.** Open the report file only when the verdict doesn't tell
you what to do next.

### 3a) The planning loop and the plan gate

Planning is one `planner` spawn, then at most **two** `plan-critique` turns, then the
owner gate:

1. Spawn `planner` → `PLANNED`, producing `plan-dev.md` and `plan-qa.md`.
2. Set `stage: critiquing`; spawn `plan-critique` with `turn: 1`. While any finding is
   open (`OPEN (n>0)`), resume the `planner` agent by name to revise, then resume
   `plan-critique` by name with `turn: 2`. **Stop after turn 2 regardless** — the
   ceiling is two turns, not convergence.
3. **The plan gate** — the critique reports in the reviewer's severity language, and the
   gate keys on **Blockers** (`review-severity.md`). Set `stage: awaiting-plan-approval`,
   then:
   - `BLOCKERS: 0` → **auto-approve**: set `plans_approved: true` and
     `plan_auto_approved: true` in the manifest, and proceed. No owner pause. Any open
     Warnings/Questions/Suggestions travel to the developer as `plan_open_issues_file`.
   - `BLOCKERS (n>0)` after turn 2 → take `plan-dev.md`, `plan-qa.md` and
     `plan-open-issues.md` to the owner and **wait**. The owner approves as-is or
     resolves the blockers (their resolution wins — note it in `plan-open-issues.md`).
     On their yes, set `plans_approved: true` (and `plan_auto_approved: false`) and
     proceed.

The plans freeze the moment `plans_approved` is set; nobody revises them after — not a
worker, not you. **This owner gate replaces `gate: owner-approved` at merge**: the human
judgement now sits before the code exists, where it is cheapest, and every
auto-approval is logged in the manifest for post-hoc spot-check.

### 4) Rework

`BUGS (n)` from `qa-implement` or `FINDINGS (n)` from `reviewer` sends the story back
to `implementing`. **Resume the same developer by name** with `SendMessage` — it
already knows why the code is shaped as it is; a fresh spawn re-reads everything to
get there.

After rework, always go through `testing` again before `reviewing`: the push strips
`gate: qa-complete`, and re-running existing specs is cheap and the only proof the
fix didn't break a previously green one.

**Ceilings** — counted per thing, not per round (three different bugs fixed is
healthy; one bug surviving twice is a signal). Stop and escalate when:

- the same IT code still fails after 2 developer attempts, or the same review finding
  survives 2 rounds — the developer's model of what is wanted disagrees with the
  specification, and more attempts won't resolve it;
- a story reaches 3 full rework cycles, even with different findings each time — a
  story that won't converge is information.

A ceiling isn't failure; it's where more agent turns stop being the answer.

### 5) Escalations

Workers message you mid-task. For each:

1. Check `rulings.md` — questions recur across stories.
2. Resolve it yourself from the epic, sub-issue, standards docs or journal if you can.
3. Take it to the developer only for: a change to the definition of done (IT codes,
   acceptance criteria, scope); a conflict between sources of truth you can't
   adjudicate; a suspected CodeQL false positive; or repeated failure suggesting the
   specification, not the code, is wrong.

**Record the ruling in `rulings.md` before replying** — a crash in between loses a
decision the developer already spent attention on. Then `SendMessage` the worker by
name, which resumes it with context intact.

### 6) The merge gate

Merge only when the pull request carries both labels **and** the story's plans were
approved — read the labels off the PR every time, including after a resume; a
pre-interruption verdict proves nothing about the branch now:

| Label | Applied by |
| --- | --- |
| `gate: qa-complete` | `qa-implement` |
| `gate: reviewer-approved` | `reviewer` |

Pushes strip both worker labels automatically, so a present label always postdates the
last commit. The owner's judgement is not a merge label — it was spent at the plan gate
(step 3a), recorded as `plans_approved: true`. Confirm that flag is set before merging;
a story that reached merge without it skipped the gate and must not proceed.

**Both labels plus approved plans is necessary, not sufficient.** QA speaks to test
coverage, the reviewer to PR cleanliness, the plan gate to the owner's intent. Before
merging, look for what only you can see: a stated requirement nothing exercised, or a
change contradicting `rulings.md` or the frozen `plan-dev.md`. That is why the decision
sits with you rather than a label count.

Then:

- **Squash-merge into the milestone branch** — never `master`, which only a
  milestone branch reaches.
- Invoke `close-issue` in `subagent` mode to verify acceptance criteria and close.
- Record the merge in the manifest before moving on.

Don't batch merges: the owner's label already puts a human decision before every
story, so holding back adds latency, not a check.

### 7) Ending the milestone

When every story is `closed`, hand off to `close-milestone`, which owns the pull
request into `master`, the CodeQL remediation loop and tagging.

### 8) Retrospective and process improvements

Before you hand off, spend the context you still hold on the two things only you can
write — you ran every story and no later session saw them happen.

**Write `retrospective.md`** in the milestone run dir. Terse, three sections, bullets
not prose:

```markdown
# Implementation retrospective — m{milestone_number}

## Good
- {what worked and should be kept}

## Improve
- {what was clumsy or slow, and the friction it caused}

## Stop
- {what actively cost tokens or attention and should go}
```

Ground every bullet in something that actually happened this milestone — a ceiling
hit, a ruling that recurred, a stage that re-ran needlessly, a brief that drifted.
Vague self-help is noise.

**Write `process-improvements.md`** in the same dir: for each learning worth acting on,
the specific MD change that would fix it. You **propose**; you do not edit any file
under `.claude/` — a self-edit by the agent that ran the milestone ships silently and
degrades every future run. Each proposal is one target file, the exact change, and the
retrospective bullet it answers:

```markdown
# Process improvements — m{milestone_number}

## P1 — {one-line summary}
- **Target:** `.claude/{path}.md`
- **Change:** {what to add / alter / remove, precisely}
- **Because:** {the retrospective bullet or incident}
- **Owner decision:** { }   ← approved | rejected | deferred
```

Leave `Owner decision` blank; the owner fills it. Tell the owner both files are ready
and that `apply-process-improvements` will apply the approved ones in a fresh session —
never apply them yourself.
