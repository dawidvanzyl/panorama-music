---
name: Tech Debt
about: Standalone remediation brief for identified tech debt (no epic parent)
title: '[Tech Debt] Short descriptive title'
labels: 'type: tech-debt'
assignees: dawidvanzyl
---

## Overview

One paragraph. What is wrong today, and what this issue changes it to. Written for someone who
has never seen the offending code.

---

## Origin

> Replaces "Epic Reference": tech debt rarely hangs off a milestone epic, so record where the
> debt was spotted instead.

- Milestone: N/A — tech debt (surfaced during #issue / M?.? work)
- Work Areas:
  - [ ] Concrete remediation step
- Discovered in: #issue or PR link — one line on how it was found (review comment, incident, audit)

---

## Motivation & Risk

> Tech debt competes with feature work, so make the cost of *not* doing this explicit.

- **Why it exists:** e.g. shipped as a shortcut under M1 deadline pressure
- **Cost of leaving it:** e.g. blocks X follow-on work; silent correctness risk under Y; N+1 that degrades at Z scale
- **Why now:** e.g. next milestone builds directly on this code; a low-risk isolated change is available

---

## Context & Constraints

> What the agent needs before writing a line: prior decisions, established patterns, things that
> must not change.

- **Current implementation:** e.g. `SmtpEmailService` builds AND sends; only consumer is `RequestPasswordResetHandler`
- **Existing patterns to follow:** e.g. all service classes use X pattern
- **Known constraints:** e.g. public signatures/behaviour must not change; stay compatible with the M1 contract
- **Related issues:** Depends on #issue / Supersedes decision from #issue

---

## Functional Requirements

What must be true after the change, as observable behaviours — not file names or signatures.
Caller/user-visible behaviour stays unchanged unless stated otherwise.

- The system must…
- `X` must continue to behave identically from the caller's perspective…

---

## API / Interface Contract

> Only if the change touches a boundary (interface, endpoint, event contract). Omit for
> internal-only refactors.

- `IInterface.Method(...)` — unchanged signature / new signature and why

---

## Acceptance Criteria (G/W/T)

> **UC codes only**, scoped to this issue's own number (`{issue_number}UC{n}`, e.g. `48UC1`),
> proven by unit and service tests. Never "NFC". Mark a subsection "N/A" rather than deleting
> the heading.

### Backend

- [ ] `[UC_CODE]` GIVEN … WHEN … THEN …

### Frontend

- [ ] `[UC_CODE]` GIVEN … WHEN … THEN …

---

## Test Specifications

> QA's input contract: end-to-end behaviours proven by Playwright. A tech-debt issue owns its
> own codes (`{issue_number}IT{n}`, e.g. `236IT1`). Include a spec only where the remediation
> changes end-to-end-observable behaviour; most tech debt is internal and has none, so leave
> this "N/A" rather than inventing coverage. A long list here means the work is probably a
> feature story wearing the wrong label.

- [ ] `[IT_CODE]` GIVEN … WHEN … THEN …

---

## Out of Scope

Explicitly what this remediation does **not** cover, to prevent scope creep during implementation.

- Deferred to: #issue or future milestone
