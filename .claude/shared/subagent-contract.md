# Subagent contract

This is the interface between the tech lead and every worker it delegates to. The
agent definitions and every skill running in `subagent` mode refer to it, so edit it
here and never inline a copy. Severity and finding rules live in
`.claude/shared/review-severity.md`, and journal layout lives in
`.claude/shared/run-journal.md`.

**The lead's context has to survive the whole milestone. A worker's context is
disposable.** Everything below follows from that asymmetry: a worker returns a
verdict and a path, and the lead opens the file only when the verdict alone doesn't
tell it what to do next. Every word a worker writes is spent from the quota that runs
the work.

## The brief: lead to worker

A brief is named inputs plus one sentence of intent, with rulings cited by number.
It's never a narrative: a narrative drifts between retellings, so a respawned worker
silently gets a different task, while named inputs reproduce exactly.

Every brief carries:

- `issue_number`
- `journal_dir`: an absolute path. The worker writes only here.
- `base_branch`: the milestone branch for milestone work, or `master` for the
  milestone branch itself and for standalone work. A worker that has to derive it
  uses the **story's assigned milestone**, never the branch name.
- `outcome`: what must be true when the work is done.
- Role inputs, always as paths: `design_file`, `prev_report`, `findings_file`,
  `pr_number`, `cycle`.

If a required input is missing, don't guess it and don't proceed. Escalate.

## The report: worker to lead

Session quota kills workers mid-task without warning.

1. **Create the report file before starting work**, on the first or second tool
   call, with a `## Progress` heading. An empty file at a known path beats a perfect
   report that never got written.
2. **Append a line after each meaningful step:** what you did, what you decided, and
   what's next.
3. **Commit as you go:** per layer or per spec, never once at the end. The PR is
   squash-merged, so the trail costs nothing. Uncommitted work in a dead session is
   redone from scratch out of the same quota.
4. **On resume, read your own report first.**

**Write conclusions, not reasoning.** Three sentences that leave no doubt beat three
paragraphs. The limit: never cut so far that a settled point gets re-raised, and when
a justification is what stops someone deciding otherwise, keep it to a clause. The
shapes:

| Artefact | Shape |
| --- | --- |
| Report | what you did and decided |
| Escalation | question, options, your recommendation |
| PR comment | finding, source, consequence |
| Reply to the lead | the verdict block, and nothing else |

The verdict block is `VERDICT: {value}` and `REPORT: {absolute path}`, plus whatever
fields the role needs to be actionable (`SHA`, `PR`, `BUGS`, `IT_CODES`, `AC`). Never
paste a diff, findings table, test log or design into the reply.

## Verdicts

| Role | Succeeded | Did not succeed | Cannot proceed |
| --- | --- | --- | --- |
| `qa-design` | `DESIGNED` | — | `NEEDS_RULING (n)` |
| `developer` | `PR_OPEN` / `FIXED` | `BLOCKED (n)` | `NEEDS_RULING (n)` |
| `verify-implementation` | `PASS` | `BLOCKED (n)` | `NEEDS_RULING (n)` |
| `qa-implement` | `SIGNED_OFF` | `BUGS (n)` | `NEEDS_RULING (n)` |
| `reviewer` | `APPROVED` | `FINDINGS (n)` | `NEEDS_RULING (n)` |
| `close-issue` | `CLOSED` | `BLOCKED (n)` | — |
| `prepare-base` | `PREPARED` | `BLOCKED (n)` | — |

"Did not succeed" is an ordinary outcome: the work found something and the loop
continues. Report it plainly, because softening a real finding breaks the only signal
the lead has. `NEEDS_RULING` means the work has stopped and can't restart without a
decision. It isn't a way to hand back work that is merely difficult.

## Escalation

You run in the background, so message the tech lead as soon as you're stuck. Turns
spent working around an unanswerable question are wasted twice. State:

1. what you were doing
2. the specific question
3. the options you see, and which one you'd choose
4. what you'll do with each answer

Points 3 and 4 make it answerable in a word. "The issue says withdrawal keeps the
row; the contract implies deletion. I'd keep it. Confirm, or say delete?" beats "How
should withdrawal work?".

Escalate only when a decision sits above you:

- two sources of truth conflict and nothing you can read settles which one governs
- the definition of done would have to change (acceptance criteria, IT codes or scope)
- a recurring failure suggests the specification, not the code, is wrong
- a role boundary blocks work you believe is required

Read the issue, the epic, the standards docs and your inputs first. A question the
lead answers by quoting a document you already had bought nothing.

## Role boundaries

A hook denies each role writes outside its remit. A denial is a boundary, not a
permission gap: don't retry the write, and don't rephrase it as a shell command. If
the change really is required, escalate and say why.

- The developer can't edit `e2e/`, because a test bent to fit the implementation stops
  being evidence.
- `qa-implement` can't edit `src/` or `frontend/`, because a fix made there bypasses
  the PR and the review.
- The lead edits none of these, because its context is worth more than the edit.

## What no worker decides

A worker reports; it doesn't conclude. `qa-implement` signs off testing, and
`reviewer` approves the PR. Neither decides the story is done. No worker merges,
closes a story issue (except `close-issue` after the lead's merge), or moves on to
the next story. The tech lead decides a story is done, from QA's sign-off, the
reviewer's approval and the owner's approval together. That decision is never
delegated.
