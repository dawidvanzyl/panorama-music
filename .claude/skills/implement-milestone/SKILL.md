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
story caught mid-stage, read the interrupted worker's newest report
(`implement-{n}.md`, `qa-run-{n}.md` or `review-{n}.md`) to see how far it got.

Report where you are picking up in one line, then continue.

### 2) Select the next story

The tech lead's hard rules (`.claude/agents/tech-lead.md`) govern this loop: one step
at a time, and you own the order.

From `00-skeleton.md` and the manifest, pick a story that is not `merged` or `closed`
and whose `depends_on` issues are all closed, preferring the one unblocking the most
others. If none is eligible and none is in flight, the graph has a cycle or stalled
blocker — stop and report it.

### 3) Run the story

| Stage | Role | Skill |
| --- | --- | --- |
| `designing` | `qa-design` | `qa-design` |
| `implementing` | `developer` | `implement-issue` |
| `testing` | `qa-implement` | `qa-implement` |
| `reviewing` | `reviewer` | `review-pull-request` |

Set `stage` in the manifest, then spawn with `subagent_type` = role and
`run_in_background: true`. **Always background:** only background subagents can
`SendMessage` to `main`, and you couldn't read it while blocked anyway — a foreground
worker turns every escalation into "give up and report".

**The brief** (per `.claude/shared/subagent-contract.md`) is named inputs plus one
sentence of intent, rulings cited by number — never a narrative, which drifts
between retellings so a respawned worker silently gets a different task. Always
include `issue_number`, `journal_dir` (absolute), `base_branch` (the milestone
branch), `mode: subagent` and `outcome`, plus role inputs (`design_file`,
`prev_report`, `pr_number`, and for the reviewer `cycle` — the story's
`attempts.review` from the manifest). `qa-design` has no shell, so first write
`issue_body_file`, `epic_body_file` and `it_codes_file` into its `journal_dir`.

End every brief with the same two lines: create your report file before starting
work, and commit as you go. They are in the contract too, but a rule stated only in
a shared doc is one a worker under turn pressure skips.

**Read the verdict line only.** Open the report file only when the verdict doesn't
tell you what to do next.

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

Merge only when the pull request carries all three labels — read them off the PR
every time, including after a resume; a pre-interruption verdict proves nothing about
the branch now:

| Label | Applied by |
| --- | --- |
| `gate: qa-complete` | `qa-implement` |
| `gate: reviewer-approved` | `reviewer` |
| `gate: owner-approved` | the developer, by hand |

Pushes strip the two worker labels automatically but not the owner's, so **check that
`gate: owner-approved` postdates the last commit**. If it's stale, say so and ask
again.

**All three is necessary, not sufficient.** QA speaks to test coverage, the reviewer
to PR cleanliness, the owner to their own satisfaction. Before merging, look for what
only you can see: a stated requirement nothing exercised, or a change contradicting
`rulings.md`. That is why the decision sits with you rather than a label count.

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
