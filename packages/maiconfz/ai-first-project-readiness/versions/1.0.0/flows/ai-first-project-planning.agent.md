---
name: ai-first-project-planning
description: >-
  Analyze readiness, ask consent, then draft a phased or full-shot
  improvement plan.
version: 1.0.0
license: MIT
agents:
  - ai-readiness-analyst
  - improvement-planner
inputs:
  - name: planning-consent
    type: boolean
    description: Optional prior consent to run improvement planning.
  - name: plan-mode
    type: string
    description: Optional plan shape; phased or full-shot when already known.
  - name: user-clarifications
    type: string
    description: Optional user answers accumulated across clarification loops.
outputs:
  - name: readiness-report
    type: string
    description: Markdown readiness report from ai-readiness-analyst.
  - name: improvement-plan
    type: string
    description: Markdown plan; empty if the user declined planning.
  - name: open-questions
    type: string
    description: Remaining questions after analysis or planning.
---

# Overview

Workspace entry for this package. Analyze the **host project**, present
the report, **ask before planning**, then draft a phased or full-shot
improvement plan. Planning only. Does not include `ai-first-chat`.

```text
analyze → present report → ask consent → ask plan-mode → plan → handoff
```

## Steps

1. **Analyze** — Invoke `ai-readiness-analyst` with optional
   `user-clarifications`. Present `readiness-report` to the user.

2. **Consent** — If `planning-consent` is not true, ask whether to
   proceed to improvement planning. If the user declines, hand off the
   report, leave `improvement-plan` empty, and stop.

3. **Plan mode** — If `plan-mode` is not `phased` or `full-shot`, ask
   which shape to use before calling the planner.

4. **Plan** — Invoke `improvement-planner` with `readiness-report`,
   `planning-consent` true, `plan-mode`, and `user-clarifications`. If
   `blocking-questions` is non-empty, ask the user, append answers to
   `user-clarifications`, and repeat this step (max **three** Q&A
   cycles).

5. **Handoff** — Present `readiness-report`, `improvement-plan`, and
   remaining `open-questions`. State that implementation requires a
   different agent or an explicit user request. This package does not
   implement.

## Error Handling

- **Unreadable or empty workspace:** Report that and stop. Do not invent
  a codebase.
- **User declines planning:** Return the report, empty
  `improvement-plan`.
- **Planner invoked without a report:** Ask the user to run this flow
  (or `ai-readiness-analyst`) first.
- **Same blockers after three Q&A cycles:** Stop looping and surface
  them in `open-questions`.
- **User asks to implement:** Refuse. This package is plan-only unless
  they use a different agent.

## Interaction Contract

**Input:** optional `planning-consent`, optional `plan-mode`, optional
`user-clarifications`.

**Output:** `readiness-report`, `improvement-plan` (empty if declined),
and `open-questions`.

When the host IDE provides a planning-only mode, use it for these steps.
MUST NOT start code implementation unless the user explicitly requests
execution with another agent.
