# Subagent contract

The interface between the tech lead and every worker role it delegates to.
Referenced by the agent definitions in `.claude/agents/` and by every skill that
runs in `subagent` mode. Edit it here — never inline a copy back into a skill or
an agent file, or the two will drift.

Severity levels, finding tables and standards-doc rules are **not** repeated here.
They live in `.claude/shared/review-severity.md` and apply unchanged.

## Why this exists

The tech lead's context has to survive an entire milestone. Every worker's context
is disposable — it dies when the task ends and nothing is lost. That asymmetry is
the whole reason for this contract: a worker that returns its findings as prose
spends the one resource that cannot be recreated.

So the rule that governs everything below: **workers return a verdict and a path.
The lead reads the verdict, and opens the file only when the verdict alone does not
tell it what to do next.**

## The brief — lead to worker

A brief is a set of named inputs and one sentence of intent. It is never a
narrative description of the work.

Narrative briefs drift between retellings. A worker respawned after an
interruption gets a subtly different task from the one that died, and nobody can
see that it happened. Named inputs reproduce exactly.

Every brief carries:

- `issue_number` — the story this work belongs to.
- `journal_dir` — absolute path to this story's journal directory. The worker
  writes here and nowhere else. Its internal layout is the lead's business, not
  the worker's; see `.claude/shared/run-journal.md`.
- `base_branch` — the milestone branch for milestone work, `master` for the
  milestone branch itself and for standalone work carrying no milestone. The lead
  passes it because it already knows the milestone; a worker that needs it without
  being told derives it from the **story's assigned milestone**, never from the
  branch name. Not every story has one — standalone tech debt and dependency bumps
  branch from `master` and return to it.
- `outcome` — one sentence stating what must be true when the work is done.

Plus whatever inputs that role needs, always as paths: `design_file`,
`prev_report`, `findings_file`, `pr_number`.

If a required input is missing, do not guess it and do not proceed. Escalate.

## The report — worker to lead

### Leave a trail, or lose the work

Session quota kills workers mid-task without warning. Four rules:

1. **Create your report file before starting work** — first or second tool call, with
   a `## Progress` heading. An empty file at a known path beats a perfect report that
   never got written.
2. **Append a line after each meaningful step** — what you did, what you decided,
   what is next.
3. **Commit as you go** — per layer, per spec, never once at the end. The pull
   request is squash-merged, so a granular trail costs nothing.
4. **On resume, read your own report first**, before redoing anything.

Uncommitted work in a dead session cannot be resumed or inspected. It is redone from
scratch, out of the same quota that killed it.

### Say it once, briefly

Every word you write is spent from the quota that runs the work, and the lead's
context has to outlast the milestone. Three sentences that leave no doubt beat three
paragraphs that also leave no doubt.

| Artefact | Shape |
| --- | --- |
| Brief | named inputs, one line of intent, rulings cited by number |
| Report | what you did and decided — not the reasoning that got you there |
| Reply to the lead | verdict block only |
| Escalation | question, options, your recommendation |
| PR comment | finding, source, consequence |

Cut reasoning, keep conclusions. The bound: never cut so far that someone re-raises a
settled point — one round trip costs more than the sentences saved. When a
justification is what stops a worker deciding otherwise, keep it to a clause.

The reply to the lead is the verdict block and nothing else:

```
VERDICT: {value}
REPORT: {absolute path}
```

Plus any fields that role's verdict needs to be actionable — `SHA`, `PR`,
`BUGS`, `IT_CODES`.

Never paste a diff, a findings table, a test log, or a scenario design into the
reply. If the lead needs it, it opens the file.

## Verdicts

Every role uses the same three outcomes. Only the success value differs, because
"done" means something different for each of them.

| Role | Succeeded | Did not succeed | Cannot proceed |
| --- | --- | --- | --- |
| `qa-design` | `DESIGNED` | — | `NEEDS_RULING (n)` |
| `developer` | `PR_OPEN` / `FIXED` | `BLOCKED (n)` | `NEEDS_RULING (n)` |
| `qa-implement` | `SIGNED_OFF` | `BUGS (n)` | `NEEDS_RULING (n)` |
| `reviewer` | `APPROVED` | `FINDINGS (n)` | `NEEDS_RULING (n)` |

`BLOCKED`, `BUGS` and `FINDINGS` are ordinary outcomes, not failures. They mean
the work found something and the loop continues. Report them plainly — a worker
that softens a real finding to look successful breaks the only signal the lead
has.

`NEEDS_RULING` is different: it means the work has stopped and cannot restart
without a decision. Use it only when that is true. It is not a way to hand back
work that is merely difficult.

## Escalation

Workers run in the background, so you can message the tech lead directly while you
work rather than finishing and reporting failure. Do it as soon as you are stuck —
turns spent working around a question you cannot answer are turns wasted twice.

An escalation states four things:

1. What you were doing when you stopped.
2. The specific question, answerable as asked.
3. The options you can see, and which one you would choose.
4. What you will do with each possible answer.

Points 3 and 4 are what make an escalation cheap to answer. "How should
withdrawal work?" costs a full round trip to turn into a question worth
answering. "The issue says withdrawal keeps the enrolment row; the API contract
implies deletion. I would keep the row. Confirm, or say delete?" can be answered
in a word.

Escalate when a decision genuinely sits above you:

- Two sources of truth conflict and nothing you can read settles which governs.
- The work requires changing the definition of done — acceptance criteria, IT
  codes, scope.
- The same failure recurs in a way that suggests the specification is wrong rather
  than the code.
- A role boundary blocks work you believe is genuinely required.

Do not escalate to confirm something already written down. Read the issue, the
epic, the standards docs and your brief's inputs first. A question the lead
answers by quoting a document you had is a question that cost two round trips and
bought nothing.

## Role boundaries

Each role is denied write access to paths outside its remit, enforced by a hook
rather than by instruction. A denial is a boundary, not a permission gap:

- Do not retry the same write.
- Do not rephrase it as a shell command.
- If the change is genuinely required, escalate and say why.

The boundaries are deliberate and each one protects something specific. The
developer cannot edit `e2e/` because a test bent to accept the implementation
stops being evidence. `qa-implement` cannot edit `src/` or `frontend/` because a
fix applied there routes around the pull request and the review. The lead cannot
edit any of them because its context is worth more than the edit.

## What no worker decides

A worker reports; it does not conclude.

- `qa-implement` signs off **testing**. It does not decide the story is done.
- `reviewer` approves the **pull request**. It does not decide the story is done,
  and it does not merge.
- No worker merges, closes an issue, or moves to the next story.

The tech lead decides a story is done, from QA's sign-off and the reviewer's
approval together. That decision is the one thing in this pipeline that is never
delegated.
