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
story caught mid-stage, read the interrupted worker's newest report (`plan-dev-v{n}.md`
/ `critique-v{n}.md`, `implement-{n}.md`, `qa-run-{n}.md` or `review-{n}.md`) to see
how far it got. A story at `awaiting-answers` resumes by re-posting the open round from
`plan-questions.md`, not by re-planning.

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
| `planning` | `planner` | `plan-implementation` | `plan-dev-v{n}.md`, `plan-qa-v{n}.md` |
| `critiquing` | `plan-critique` | `plan-critique` | `critique-v{n}.md` |
| `awaiting-answers` | — (owner) | — | `plan-answers.md` |
| `specifying` | `qa-implement` (`phase: specify`) | `qa-implement` | failing specs on the feature branch |
| `implementing` | `developer` | `implement-issue` | the PR, every IT spec green locally |
| `testing` | `qa-implement` (`phase: run`) | `qa-implement` | `gate: qa-complete` |
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
`test_intents_file` into the story's `journal_dir`; the `planner` writes the versioned
plans and `plan-critique` writes `critique-v{n}.md`, all in that dir; the planner also
gets `version`, `critique_file` and `answers_file`, and the critique gets `version` and
`answers_file`; the developer gets `dev_plan_file` (and `plan_answers_file` whenever
`plan-answers.md` exists), `qa-implement` gets `qa_plan_file`, and the reviewer gets
`cycle` (the story's `attempts.review`).

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
an item whose proof is "done", "reviewed" or a missing test is a hit). Any
hit goes straight back to the developer — it never costs a QA run. They are in the contract too, but a rule stated only in a shared
doc is one a worker under turn pressure skips.

**Read the verdict line only.** Open the report file only when the verdict doesn't tell
you what to do next.

**Autonomy.** The owner is usually away or asleep while this runs. Resolve every
issue you can from the epic, the issue, the standards, the plans and `rulings.md`, and
record the ruling. Stop for the owner only when you are thoroughly blocked: a plan
question round (step 3a), a change to the definition of done, or a ceiling reached.
Owner answers that arrive while other work runs are applied when they land, not
waited for.

**The plan stage is the exception.** There you rule on nothing: every open question —
requirement or engineering, including a rule override — goes to the owner, and the
milestone stops until it is answered.

### 3a) The planning loop and the plan approval

**Plan and critique.** Per question round: at most three plans and two critiques, in
the order plan, critique, plan, critique, plan. Increment `plan_version` before each
planner pass and `attempts.critique` before each critique.

1. Spawn `planner` → `PLANNED`, writing `plan-dev-v{n}.md` and `plan-qa-v{n}.md`.
2. Set `stage: critiquing`; spawn `plan-critique` against that version (resume it by
   name on later critiques). A critique always gets a fresh look at the plan, never
   your summary of it.
3. `APPROVE` → go to *Questions*.
4. `REVISE (n)` → resume the `planner` by name with `critique_file`. After the round's
   first critique, return to 2 with the new version. After the second, the new
   version is the round's final plan and is **not** re-critiqued: open
   `critique-v{n}.md`'s required changes and the new plan, and check each change
   landed. One that didn't land becomes an engineering question.

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

**Waiting.** The milestone stops; nothing else runs, and there is no timeout.

- Map each reply to its question number; a reply with no number and one open
  question maps to it. A reply that isn't an answer (a scope change, a command) is not
  acted on — say what is still open and wait.
- Never proceed on an unanswered question. There are no default answers, and you rule
  on none of them.
- The one exception: the owner says **"implement as is"**. Proceed on the latest plan,
  record each open question in `plan-answers.md` as `AUDIT: Q{n} open when the owner
  instructed implement-as-is, proceeded on {planner's reading}`, and set
  `plan_as_is: true`.
- **Pause** when the owner says pause or stop, or an answer says the story is being
  re-scoped or blocked. A resume after a re-scope re-plans from scratch as the next
  version, in a new round.

**Feed answers back.** Append the round's answers to `plan-answers.md` verbatim, each
with its question number and type. If every answer confirms the current reading, the
plan stands — go to *Approval*. Otherwise resume the `planner` by name with
`answers_file`, reset `attempts.critique` to `0`, and start the next round at step 2.
There is no cap on question rounds.

**Approval.** You approve the plans — there is no separate owner go — when the latest
version was approved by the critique or verified by you after a second `REVISE`, and
no question is open (or the owner said "implement as is"). Copy that version to
`plan-dev.md` and `plan-qa.md` and set `plans_approved: true`.

The plans freeze the moment `plans_approved` is set; nobody revises them after — not a
worker, not you. The owner's judgement is spent in the question rounds, before the code
exists, where it is cheapest.

### 4) Rework

`BUGS (n)` from `qa-implement` or `FINDINGS (n)` from `reviewer` sends the story back
to `implementing`. **Resume the same developer by name** with `SendMessage` — it
already knows why the code is shaped as it is; a fresh spawn re-reads everything to
get there.

If you verify that the diff since QA's sign-off changes only comments, test names or
trait/tag strings, QA re-applies `gate: qa-complete` from the diff without a stack
run; CI's E2E run is the behavioural proof.

Otherwise, after rework, always go through `testing` again before `reviewing`: the push strips
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

The developer strips both labels before every push (`implement-issue` step 6); at the
merge gate, confirm each label was applied after the head commit's push. The owner's judgement is not a merge label — it was spent in the plan question
rounds (step 3a), and the plans' approval is recorded as `plans_approved: true`.
Confirm that flag is set before merging; a story that reached merge without it skipped
the plan stage and must not proceed.

**Both labels plus approved plans is necessary, not sufficient.** QA speaks to test
coverage, the reviewer to PR cleanliness, the plan answers to the owner's intent. Before
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
