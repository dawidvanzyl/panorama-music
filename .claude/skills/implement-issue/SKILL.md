---
name: implement-issue
description: >
  Load this skill when the user says "implement issue", "implement-issue", or
  "/implement-issue", or when implement-milestone runs its next story. Orchestrates one
  issue end to end as the lead: plan and critique with every open question to the
  owner, QA's specs first, the developer, QA, review, rework and the merge gate. Runs
  a milestone story for implement-milestone, or a standalone issue (no milestone)
  against master on its own.
license: MIT
metadata:
  audience: maintainers
  workflow: github-issues-pr
---

## Role

You are the lead for one issue: you orchestrate, you do not implement. Delegate each
stage to a worker role and escalate what you can't rule on — never edit `src/`,
`frontend/` or `e2e/` yourself, whether or not a path guard stops you.

**Run inline, never as a subagent.** This skill spawns the workers, and a subagent
can't spawn subagents.

The hard rules in `.claude/shared/lead-rules.md` apply here, except rule 2 (story order
is `implement-milestone`'s). Briefs, verdicts and escalation follow
`.claude/shared/subagent-contract.md`; run state follows
`.claude/shared/run-journal.md`.

Two rules run through every step:

- **Update the manifest before acting, never after**, so a crash leaves it
  understating rather than overstating what happened.
- **Never invent an IT code or change a frozen artifact** — both are escalations.

## Inputs

- `issue_number` — required; ask if not given.
- From `implement-milestone` only: `milestone_number`, `run_dir` (the milestone's
  `journal_root`), `journal_dir` (the story's directory) and `base_branch` (the
  milestone branch). Their presence is what makes this a **milestone story**; without
  them it is a **standalone issue**.

## Procedure

### 0) Set up

**Milestone story.** Everything is in the milestone's journal already: the story's
manifest entry, `rulings.md`, `it-codes.json` and the story's `test-intents.json`. Go
to step 1.

**Standalone issue.** Read `gh issue view {issue_number} --json title,body,labels,milestone,state`
and stop, saying why, when any of these holds:

| Refuse | Because |
| --- | --- |
| The title starts `[Backlog]` or it carries `epic: backlog` | a backlog epic isn't work |
| It has a milestone (epic or story) | milestone work runs through `implement-milestone` |
| It's closed | nothing to do |
| `## Test Specifications` is missing, or empty without an explicit `N/A` | QA has no contract; the codes are written when the issue is created, never by this run |
| It touches the UI (`layer: frontend` or a `## Page Architecture` section) with no **Design reference:** bullet | the mockup is authoritative and is never invented — ask for one in `.design/` and a Design reference on the issue |
| A `Depends on #X` in `## Context & Constraints` is still open | it can't be built yet |

Then set up the journal at `{HOME}/.claude/runs/panorama-music/issues/{issue_number}/`,
resolving `{HOME}` once (*Standalone issues* in `run-journal.md`). That directory is
both `run_dir` and `journal_dir`. `base_branch` is `master`.

### 1) Resume: replay, then reconcile

Follow *Resume: replay, then reconcile* in `run-journal.md`. For an issue caught
mid-stage, read the interrupted worker's newest report (`plan-dev-v{n}.md` /
`critique-v{n}.md`, `implement-{n}.md`, `qa-run-{n}.md` or `review-{n}.md`) to see how
far it got. An issue at `awaiting-answers` resumes by re-posting the open round from
`plan-questions.md`; one at `awaiting-merge` resumes at step 5. Never re-plan either.

Report where you are picking up in one line, then continue.

### 2) Run the stages

Each issue runs these stages in order. Set `stage` in the manifest **before** you
spawn, then spawn with `subagent_type` = role and `run_in_background: true`.

| Stage | Role | Skill | Produces |
| --- | --- | --- | --- |
| `planning` | `planner` | `plan-implementation` | `plan-dev-v{n}.md`, `plan-qa-v{n}.md` |
| `critiquing` | `plan-critique` | `plan-critique` | `critique-v{n}.md` |
| `awaiting-answers` | — (owner) | — | `plan-answers.md` |
| `specifying` | `qa-implement` (`phase: specify`) | `qa-implement` | failing specs on the feature branch |
| `implementing` | `developer` | `implement-plan`, then `open-pr` | the PR, every IT spec green locally |
| `testing` | `qa-implement` (`phase: run`) | `qa-implement` | `gate: qa-complete` |
| `reviewing` | `reviewer` | `review-pull-request` | `gate: reviewer-approved` |
| `awaiting-merge` | — (owner) | — | standalone only: the owner's merge into `master` |

**Always background:** only background subagents can `SendMessage` to `main`, and you
couldn't read it while blocked anyway — a foreground worker turns every escalation into
"give up and report".

**One agent per role per issue, kept warm.** Spawn each role once. For every rework or
revision — a critique sending the plan back, a bug or finding sending the developer
back — resume the *same* agent by name with `SendMessage`; it already holds the context
a fresh spawn would burn tokens re-deriving.

**The brief** (per `subagent-contract.md`) is named inputs plus one sentence of
intent, rulings cited by number — never a narrative, which drifts between retellings so
a respawned worker silently gets a different task. Always include `issue_number`,
`journal_dir` (absolute), `base_branch`, `mode: subagent` and `outcome`, plus role
inputs. `planner` and `plan-critique` have no shell, so first write `issue_body_file`
into `journal_dir` — and for a milestone story also `epic_body_file`, `it_codes_file`
and `test_intents_file`; a standalone issue has none, and its own
`## Test Specifications` and `## Acceptance Criteria (G/W/T)` are the codes. The
`planner` writes the versioned plans and `plan-critique` writes `critique-v{n}.md`, all
in that dir; the planner also gets `version`, `critique_file` and `answers_file`, and
the critique gets `version`, `dev_plan_file` and `qa_plan_file` (that version's files),
`answers_file` and, on a second critique in a round, `prev_critique_file`; the
developer gets `dev_plan_file` (and `plan_answers_file` whenever `plan-answers.md`
exists), `qa-implement` gets `qa_plan_file`, and the reviewer gets `cycle` (the
manifest's `attempts.review`) and `plan_answers_file` when it exists.

`qa-implement` in `phase: specify` gets `branch` (named per `docs/coding-standards.md`)
and `dev_plan_file`; the developer then gets that `branch`. The developer's brief
always restates the definition of done in one line: every plan-dev checklist item
ticked, every UC and IT code green locally, the whole-solution gauntlet green, and
coding-standards §5 and §6 honoured.

End every brief with the same two lines: create your report file before starting work,
and commit as you go.

**Check the developer before QA.** A `PR_OPEN` or `FIXED` goes to `testing` only
after you grep its `implement-{n}.md` for: an unticked checklist item, an IT code
without a local pass, a backend test command narrower than the solution, and a
checklist item whose named test does not exist on the branch (grep its name or AC tag;
an item whose proof is "done", "reviewed" or a missing test is a hit). Any hit goes
straight back to the developer — it never costs a QA run. They are in the contract
too, but a rule stated only in a shared doc is one a worker under turn pressure skips.

**Read the verdict line only.** Open the report file only when the verdict doesn't tell
you what to do next.

**Owner contact.** At the plan stage you rule on nothing: every open question —
requirement or engineering, including a rule override — goes to the owner (step 2a).
After the plans are approved, resolve each worker escalation you can from the epic (if
any), the issue, the standards, the approved plans, `plan-answers.md` and
`rulings.md`, and record the ruling; go to the owner only for the cases in step 4.
Whenever you wait on the owner, everything waits — one issue and one stage at a time
(`lead-rules.md` rule 1) means nothing else runs meanwhile.

### 2a) The planning loop and the plan approval

**Plan and critique.** Per question round: at most three plans and two critiques, in
the order plan, critique, plan, critique, plan. Increment `plan_version` before each
planner pass and `attempts.critique` before each critique.

1. Spawn `planner` → `PLANNED`, writing `plan-dev-v{n}.md` and `plan-qa-v{n}.md`.
2. Set `stage: critiquing`; spawn `plan-critique` against that version (resume it by
   name on later critiques). A critique always gets a fresh look at the plan, never
   your summary of it. The second critique in a round gets `prev_critique_file` and is
   scoped to: the previous required changes landed, and the v(n-1)→v(n) diff. It does
   not re-audit what the first critique cleared.
3. `APPROVE` → go to *Questions*.
4. `REVISE (n)` → resume the `planner` by name with `critique_file`. After the round's
   first critique, return to 2 with the new version. After the second, the new
   version is the round's final plan and is **not** re-critiqued: open
   `critique-v{n}.md`'s required changes and the new plan, and check each change
   landed. One that didn't land becomes an engineering question. Then go to
   *Questions*.

A required change the planner `DECLINED` is not spent on another revision: it becomes a
question of the type the disputed reading belongs to (requirement for the issue, epic
or mockup; engineering for the code or a standard), quoting the critic's reading and
the planner's.

**Questions.** Classify every open item from the latest plan's `## Notes` and the
latest critique:

- *Requirement* — every requirement `ASSUMPTION` not marked `RESOLVED:`; every
  critique `QUESTION` labelled requirement; every declined change disputing a reading
  of the issue, epic or mockup.
- *Engineering* — every `CONFLICT` from the planner or the critique; every critique
  `QUESTION` labelled engineering; every declined change disputing a reading of the
  code or a standard; every required change that didn't land; every engineering
  `ASSUMPTION` not marked `RESOLVED:`.

If both lists are empty, go to *Approval*. Otherwise set `stage: awaiting-answers`,
increment `plan_round`, append the round to `plan-questions.md`, and post it to the
owner as one message — through `AskUserQuestion` when there are four questions or fewer,
one question per entry, otherwise as plain text:

```
Round {r} questions for #{issue_number}
Requirement questions:
1. {question} (current assumption: {x})
Engineering questions:
2. {question} (current assumption: {x})
Reply with the number and your answer. "Confirmed" on a number accepts the assumption.
```

Number questions across both lists. A requirement question states the assumption, why
it is uncertain, and what a good answer looks like. A conflict question carries the
requirement, the rule and where it lives, and the compliant alternative, and asks which
to build. Ask only what blocks a correct plan; never re-ask an answered question.

**Waiting.** Everything stops; nothing else runs, and there is no timeout.

- Map each reply to its question number; a reply with no number and one open
  question maps to it. A reply that isn't an answer (a scope change, a command) is not
  acted on — say what is still open and wait.
- Never proceed on an unanswered question. There are no default answers, and you rule
  on none of them.
- The one exception: the owner says **"implement as is"**. Proceed on the latest plan,
  record each open question in `plan-answers.md` as `AUDIT: Q{n} open when the owner
  instructed implement-as-is, proceeded on {planner's reading}`, and set
  `plan_as_is: true`.
- **Pause** when the owner says pause or stop, or an answer says the issue is being
  re-scoped or blocked. A resume after a re-scope re-plans from scratch as the next
  version, in a new round.

**Feed answers back.** Append the round's answers to `plan-answers.md` verbatim, each
with its question number and type. Write every requirement answer back into the
issue — a "Confirmed" stated as the confirmed reading — under a `## Notes` section
(add it at the end if absent): append to `issue_body_file` with `Edit`, then
`gh issue edit {issue_number} --body-file {issue_body_file}`. The issue is what the
developer, verify, the reviewer and `close-issue` read; an answer only the planner saw
gets flagged as a defect later. Engineering answers stay in `plan-answers.md`, which
every later role receives. If every answer confirms the current reading, the plan
stands — go to *Approval*. Otherwise resume the `planner` by name with `answers_file`,
reset `attempts.critique` to `0`, and start the next round at step 2. There is no cap
on question rounds.

**Approval.** You approve the plans — there is no separate owner go — when the latest
version was approved by the critique or verified by you after a second `REVISE`, and
no question is open (or the owner said "implement as is"). Copy that version to
`plan-dev.md` and `plan-qa.md` and set `plans_approved: true`.

The plans freeze the moment `plans_approved` is set; nobody revises them after — not a
worker, not you. The owner's judgement is spent in the question rounds, before the code
exists, where it is cheapest.

### 3) Rework

`BUGS (n)` from `qa-implement` or `FINDINGS (n)` from `reviewer` sends the issue back
to `implementing`. **Resume the same developer by name** with `SendMessage` — it
already knows why the code is shaped as it is; a fresh spawn re-reads everything to
get there.

If you verify that the diff since QA's sign-off changes only comments, test names or
trait/tag strings, QA re-applies `gate: qa-complete` from the diff without a stack
run; CI's E2E run is the behavioural proof.

Otherwise, after rework, always go through `testing` again before `reviewing`: `open-pr`
strips `gate: qa-complete` after the rework push, and re-running existing specs is cheap and the only proof
the fix didn't break a previously green one.

**Ceilings** — counted per thing, not per round (three different bugs fixed is
healthy; one bug surviving twice is a signal). Stop and escalate when:

- the same IT code still fails after 2 developer attempts, or the same review finding
  survives 2 rounds — the developer's model of what is wanted disagrees with the
  specification, and more attempts won't resolve it;
- an issue reaches 3 full rework cycles, even with different findings each time — an
  issue that won't converge is information.

A ceiling isn't failure; it's where more agent turns stop being the answer.

### 4) Escalations

Workers message you mid-task. For each:

1. Check `rulings.md` — questions recur.
2. Resolve it yourself from the epic (if any), the issue, standards docs or journal if
   you can.
3. Take it to the owner only for: a change to the definition of done (IT codes,
   acceptance criteria, scope); a conflict between sources of truth you can't
   adjudicate; a suspected CodeQL false positive; or repeated failure suggesting the
   specification, not the code, is wrong.

**Record the ruling in `rulings.md` before replying** — a crash in between loses a
decision the owner already spent attention on. Then `SendMessage` the worker by
name, which resumes it with context intact.

### 5) The merge gate

The pull request is ready only when it carries both labels **and** the plans were
approved — read the labels off the PR every time, including after a resume; a
pre-interruption verdict proves nothing about the branch now:

| Label | Applied by |
| --- | --- |
| `gate: qa-complete` | `qa-implement` |
| `gate: reviewer-approved` | `reviewer` |

`open-pr` strips both labels on every rework re-entry; at the
merge gate, confirm each label was applied after the head commit's push. The owner's
judgement is not a merge label — it was spent in the plan question rounds (step 2a),
and the plans' approval is recorded as `plans_approved: true`. Confirm that flag is set;
an issue that reached the gate without it skipped the plan stage and must not proceed.

**Both labels plus approved plans is necessary, not sufficient.** QA speaks to test
coverage, the reviewer to PR cleanliness, the plan answers to the owner's intent. Look
for what only you can see: a stated requirement nothing exercised, or a change
contradicting `rulings.md` or the frozen `plan-dev.md`. That is why the decision sits
with you rather than a label count.

Then:

- **Milestone story** — squash-merge into the milestone branch (never `master`, which
  only a milestone branch reaches) with `--subject "{PR title} (#{pr_number})"`, where
  the PR title is `{issue_title} (#{issue_number})` per coding-standards §3 (state that
  exact title in the developer brief), record the merge in the manifest, and return to
  `implement-milestone`.
- **Standalone issue** — set `stage: awaiting-merge` and tell the owner in one line
  that PR #{pr_number} is ready to merge into `master`. **The owner merges; you never
  do.** Wait for their reply, then confirm with `gh pr view {pr_number} --json state`
  that it is `MERGED` — anything else, say so and keep waiting. Record the merge in the
  manifest.

Either way, invoke `close-issue` in `subagent` mode to verify acceptance criteria and
close, and set `stage: closed` on `CLOSED`.
