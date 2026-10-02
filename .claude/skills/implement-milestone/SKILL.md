---
name: implement-milestone
description: >
  Load this skill when the user says "implement milestone", "implement-milestone", or
  "/implement-milestone". Orchestrates the implementation of a planned milestone: selects
  the next sub-issue in dependency order, runs each through implement-issue, reconciles
  run state against GitHub, and hands the finished milestone to close-milestone.
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

Each story runs through `implement-issue`, which owns everything per story: the plan
stage and owner questions, the workers, rework, escalations and the merge gate. This
skill owns what spans stories: resume, order, the end of the milestone and the
retrospective. **Update the manifest before acting, never after**, so a crash leaves it
understating rather than overstating what happened.

## Inputs

- `milestone_number` — required; ask if not given.
- The journal at `{HOME}/.claude/runs/panorama-music/m{milestone_number}/` must exist
  with `planning_complete: true`. Otherwise stop: run `plan-milestone` first.

---

## Procedure

### 1) Resume: replay, then reconcile

Follow *Resume: replay, then reconcile* in `.claude/shared/run-journal.md`. A story
caught mid-stage goes straight back into `implement-issue` (step 3), which resumes it
from its own reports.

Report where you are picking up in one line, then continue.

### 2) Select the next story

The tech lead's hard rules (`.claude/agents/tech-lead.md`) govern this loop: one step
at a time, and you own the order.

From `00-skeleton.md` and the manifest, pick a story that is not `merged` or `closed`
and whose `depends_on` issues are all closed, preferring the one unblocking the most
others. If none is eligible and none is in flight, the graph has a cycle or stalled
blocker — stop and report it.

### 3) Run the story

Invoke `implement-issue` inline (the Skill tool, never a subagent — it spawns the
workers) with `issue_number`, `milestone_number`, `run_dir` (the manifest's
`journal_root`), the story's `journal_dir` and `base_branch` (the milestone branch). It
returns once the story is merged into the milestone branch and `close-issue` has run,
or when it stops on the owner.

Then go back to step 2. Don't batch merges: the plan stage already put the owner's
judgement before every story, so holding back adds latency, not a check.

### 4) Ending the milestone

When every story is `closed`, hand off to `close-milestone`, which owns the pull
request into `master`, the CodeQL remediation loop and tagging.

### 5) Retrospective and process improvements

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
