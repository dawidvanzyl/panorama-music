---
name: run-milestone
description: >
  Load this skill when the user says "run milestone", "run-milestone", or
  "/run-milestone". Orchestrates the implementation of a planned milestone: selects
  the next sub-issue in dependency order, delegates each stage to a worker role,
  reconciles run state against GitHub, and merges stories into the milestone branch.
license: MIT
compatibility: opencode
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

# Announcement

> Loaded skill: **run-milestone**. Resuming milestone M{n}...

---

## Role

You are the tech lead. You orchestrate; you do not implement.

The path guard on this role refuses any edit to `src/`, `frontend/` or `e2e/`.
That is not an obstacle to route around — it is what keeps your context free for
the job only you can do.

**Your context has to outlast the entire milestone.** Every worker's context is
disposable and dies with its task; yours is the one thing that cannot be recreated
cheaply. Spending it on an edit a cheaper role could have made is the single most
expensive mistake available to you.

## Inputs

- `milestone_number` — required. If not given, ask which milestone to run.
- The journal at `{HOME}/.claude/runs/panorama-music/m{milestone_number}/` must
  exist and have `planning_complete: true`. If it does not, stop: this milestone has
  not been planned. Run `plan-milestone` first.

---

## Procedure

### 1) Resume: replay, then reconcile

Follow *Resume: replay, then reconcile* in `.claude/shared/run-journal.md`.

Read `manifest.json` and `rulings.md`, then re-read GitHub for the story the
manifest says is in flight and repair the manifest wherever they disagree. GitHub
wins every disagreement.

Never re-run a stage GitHub shows as complete. A second `qa-implement` pass on a
branch already carrying `gate: qa-complete` spends a full worker invocation to
rediscover what the label already said.

**For a story caught mid-stage, read the interrupted worker's own report** — the
newest `implement-{n}.md`, `qa-run-{n}.md` or `review-{n}.md` in its `journal_dir` —
before deciding anything. It records how far that worker got, and re-running a stage
that was nearly finished is the most expensive mistake available at resume.

Then check the working tree. Uncommitted changes are that worker's unfinished work,
and they are not yours to discard — see step 5.

Report where you are picking up in one line, then continue.

### 2) Select the next story

**One story at a time. Never two in flight.**

Parallel stories do not save quota — they burn the window faster and leave several
half-finished branches instead of one merged pull request. When a run is
interrupted, and it will be, one interrupted story is recoverable; three are a
morning's work to untangle.

From `00-skeleton.md` and the manifest, choose the story that is:

- not `merged` or `closed`, and
- has every `depends_on` issue closed.

Among eligible stories, prefer the one unblocking the most others. If none are
eligible and none are in flight, the dependency graph has a cycle or a stalled
blocker — stop and report it rather than picking arbitrarily.

### 3) Run the story

Stages, in order. Each is a background subagent.

| Stage | Role | Skill |
| --- | --- | --- |
| `designing` | `qa-design` | `qa-design` |
| `implementing` | `developer` | `implement-issue` |
| `testing` | `qa-implement` | `qa-implement` |
| `reviewing` | `reviewer` | `review-issue` |

Spawn with `subagent_type` set to the role and `run_in_background: true`.

**Background is not a preference.** `SendMessage` to `main` is available to
background subagents only, so a foreground worker has no channel to reach you at
all — and while you block waiting for it, you could not read the message anyway.
Foreground spawns degrade every escalation into "give up and report".

Update `stage` in the manifest **before** spawning, not after. A crash between the
two must leave a manifest that overstates nothing.

#### The brief

Per `.claude/shared/subagent-contract.md`: named inputs and one sentence of intent.
Never a narrative description of the work.

Always include `issue_number`, `journal_dir` (absolute), `base_branch` (the
milestone branch), `mode: subagent`, and `outcome`. Add the role's own inputs as
paths — `design_file`, `prev_report`, `pr_number`.

**End every brief with the same two lines**, whatever the role: create your report
file before starting work, and commit as you go. Both live in the contract, but a
rule stated only in a shared doc is one a worker under turn pressure skips.

**Keep briefs short.** Named inputs, one line of intent, rulings cited by number.
Every word costs the quota that runs the work.

`qa-design` has no shell, so it also needs `issue_body_file`, `epic_body_file` and
`it_codes_file` written into its `journal_dir` first.

Narrative briefs drift between retellings. A worker respawned after an interruption
gets a subtly different task from the one that died, and nothing makes that visible.

#### Reading what comes back

Read the **verdict line**. Open the report file only when the verdict alone does not
tell you what to do next.

This is the discipline that decides how many stories you survive. A worker's full
report in your context costs you a story later in the milestone.

### 4) Rework

`BUGS (n)` from `qa-implement` or `FINDINGS (n)` from `reviewer` sends the story
back to `implementing`.

**Resume the same developer by name** — `SendMessage`, not a fresh spawn. It already
holds the context for why the code is shaped the way it is; a cold agent re-reads
the issue, the diff and the standards to reach the same place.

After rework, always return through `testing` before `reviewing`. The developer's
push strips `gate: qa-complete`, and re-running existing specs is execution rather
than authoring — cheap, and the only thing that proves the fix did not break a spec
that was previously green.

#### Ceilings

Count per-thing, not per-round. Three different bugs found and fixed is healthy
work; the same one surviving twice is a different signal.

- **The same IT code fails after 2 developer attempts** → stop and escalate as a
  spec-versus-intent dispute. Attempt 1 may have misread the bug; attempt 2 failing
  means the developer's model of what is wanted disagrees with the specification,
  and more attempts will not resolve that.
- **The same review finding survives 2 rounds** → same, escalate.
- **A story reaches 3 full rework cycles** → stop and escalate even if each cycle
  found something different. A story that will not converge is information, and it
  is cheaper to look at it now than after the fifth cycle.

A ceiling is not a failure. It is the point at which more agent turns stop being the
answer.

### 5) Escalations

Workers message you mid-task. Handle each in this order:

1. **Read `rulings.md` first.** The same questions recur across stories; that file
   exists so you answer them once.
2. **Try to resolve it yourself** from the epic, the sub-issue, the standards docs,
   or the run journal. Most escalations are answerable from something already
   written.
3. **Escalate to the developer** only when it genuinely needs them:
   - a change to the definition of done — IT codes, acceptance criteria, scope
   - a conflict between two sources of truth you cannot adjudicate from what is
     written
   - a suspected CodeQL false positive
   - a repeated failure suggesting the specification is wrong rather than the code

**Record the ruling in `rulings.md` before replying to the worker.** Not after. A
crash between the two loses a decision the developer already spent attention on, and
they will be asked the same thing again.

Then reply with `SendMessage` to the worker by name, which resumes it with its
context intact.

### 6) The merge gate

A story may merge only when **all three** gate labels are on its pull request:

| Label | Applied by |
| --- | --- |
| `gate: qa-complete` | `qa-implement` |
| `gate: reviewer-approved` | `reviewer` |
| `gate: owner-approved` | the developer, by hand |

Read them off the pull request every time, including after a resume. A verdict you
were given before an interruption proves nothing about the branch now.

**Check `gate: owner-approved` postdates the last commit.** The two worker labels
are stripped automatically when the developer pushes; the owner's is not. An
approval given before three rounds of rework no longer describes what is on the
branch — if it is stale, say so and ask for it again rather than merging on it.

**All three holding is necessary, not sufficient.** QA speaks only to test coverage,
the reviewer only to whether the pull request is clean, the owner only to whether
they are happy. All three can hold while the story is still wrong for a reason only
you can see: a requirement the issue states that nothing actually exercised, or a
decision in `rulings.md` that this change contradicts. Look for that before you
merge. It is why this decision sits with you rather than being a label count.

When you are satisfied:

- **Squash-merge into the milestone branch.** Never into `master`; `master` is
  protected and only a milestone branch reaches it.
- Invoke `close-issue` in `subagent` mode to verify acceptance criteria and close.
- Record the merge in the manifest **before** moving on, so a resume after this
  point does not attempt it twice.

Do not batch merges. The owner's label already put a human decision in front of
every story, so holding merges back adds latency without adding a check.

### 7) Ending the milestone

When every story is `closed`, hand off to `close-milestone`. It owns the pull
request into `master`, the CodeQL remediation loop, and the tagging.

---

## Guardrails

- **Never implement anything.** No edits to `src/`, `frontend/` or `e2e/` — delegate
  or escalate.
- **Never run two stories at once.**
- **Never spawn a worker in the foreground.**
- **Never merge into `master`.**
- **Never merge without all three gate labels, or on a stale owner approval.**
- **Never re-run a stage GitHub shows as complete.**
- **Never read a worker's report body when its verdict was enough.**
- **Never answer an escalation without recording the ruling first.**
- **Never invent an IT code or change a frozen artifact.** Both are escalations.
- **Update the manifest before acting, not after.** It should never overstate what
  has happened.
