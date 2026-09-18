---
name: apply-process-improvements
description: >
  Load this skill when the user says "apply process improvements",
  "apply-process-improvements", or "/apply-process-improvements". Applies the
  owner-approved MD changes a milestone's tech lead proposed in process-improvements.md,
  in a fresh session, so the agent that authored the proposals is not the one that
  applies them.
license: MIT
metadata:
  audience: maintainers
  workflow: process
---

## Goal

Apply the process improvements a milestone produced — and only those the owner
approved. This runs as its own session on purpose: the tech lead that wrote
`process-improvements.md` also authored the very changes it proposes, so a fresh reader
judges them without the bias of having argued for them.

You edit the agent, skill and shared MD files under `.claude/`. You change no
application code, and you invent no improvement that isn't in the approved file.

## Inputs

- `milestone_number`: required; ask if not given.
- The milestone run dir `{HOME}/.claude/runs/panorama-music/m{milestone_number}/` must
  contain `retrospective.md` and `process-improvements.md`. If either is missing, stop
  and say so.

## Procedure

### 1) Read the proposals cold

Read `retrospective.md` (the learnings) and `process-improvements.md` (the proposed MD
changes, each traced to a learning). Read them as a skeptic, not as the author.

### 2) Confirm the owner's approval

`process-improvements.md` marks each proposal `approved`, `rejected` or `deferred`
(the owner's call, made before this session). Apply **only** the `approved` ones. If
the approval marks are missing, the owner hasn't reviewed it — stop and ask; never
apply an unreviewed proposal.

### 3) Judge each approved proposal against the file

For each approved change, open the target MD and check the proposal still fits: the
text it edits exists, the learning it cites is real, and the change doesn't contradict
a rule elsewhere in the same file or in `.claude/shared/`. A proposal that no longer
applies (the file moved on, or another approved change subsumes it) is skipped with a
one-line note — you are the second judgment, not a find-and-replace.

### 4) Apply

Make the edits with `Edit`. Keep each change minimal and in the file's existing voice.
Touch only the files the approved proposals name. Never rewrite a whole file to land a
one-line change.

### 5) Report

List, per target file: the proposals applied, any skipped and why. Commit the changes
to a branch (never straight to `master`) and open a PR titled
`chore: process improvements from m{milestone_number}`, so the owner sees the final
diff before it reaches the process everyone runs.

Then append one line to the milestone's `retrospective.md` under a `## Applied`
heading: which proposals shipped, and the PR number.
