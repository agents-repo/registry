---
name: reduce-context-tokens
description: >-
  Inventory host-tree context-token waste, ask consent, then draft an ordered
  reduction plan. Planning only; does not implement.
version: 1.0.0
agents:
  - token-footprint-analyst
  - token-reduction-advisor
inputs:
  - name: planning-consent
    type: boolean
    description: Optional prior consent to run reduction planning.
  - name: user-clarifications
    type: string
    description: Optional user answers accumulated across clarification loops.
outputs:
  - name: footprint-report
    type: string
    description: Markdown footprint report from token-footprint-analyst.
  - name: reduction-plan
    type: string
    description: Markdown plan; empty if the user declined planning.
  - name: open-questions
    type: string
    description: >-
      Remaining blockers or follow-ups at handoff; copy from advisor
      blocking-questions when present.
---
# Overview

Workspace entry for this package. Analyze the **host project**, present
the footprint report, **ask before planning**, then draft an ordered
reduction plan. Planning only. Does not include `context-token-chat`.

```text
analyze → present report → ask consent → plan → handoff
```

## Steps

1. **Analyze** — Invoke `token-footprint-analyst` with optional
   `user-clarifications`. Present `footprint-report` to the user.

2. **Consent** — If `planning-consent` is not true, ask whether to
   proceed to reduction planning. If the user declines, hand off the
   report, leave `reduction-plan` empty, and stop.

3. **Plan** — Invoke `token-reduction-advisor` with `footprint-report`,
   `planning-consent` true, and `user-clarifications`. If
   `blocking-questions` is non-empty, ask the user, append answers to
   `user-clarifications`, and repeat this step (max **three** Q&A
   cycles). After the last cycle (or when none remain), copy
   `blocking-questions` into `open-questions` (empty when none).

4. **Handoff** — Present `footprint-report`, `reduction-plan`, and
   remaining `open-questions` (leftover blockers or follow-ups). State
   that implementation requires a different agent or an explicit user
   request. This package does not implement.

## Error Handling

- **Unreadable or empty workspace:** Report that and stop. Do not invent
  a codebase.
- **User declines planning:** Return the report, empty `reduction-plan`.
- **Advisor invoked without a report:** Ask the user to run this flow
  (or `token-footprint-analyst`) first.
- **Same blockers after three Q&A cycles:** Stop looping, copy them
  into `open-questions`, and surface them at handoff.
- **User asks to implement:** Refuse. This package is plan-only unless
  they use a different agent.
- **User asks to run `context-token-chat`:** Tell them chat-web is a
  separate entry. Do not call that agent from this flow.

## Interaction Contract

**Input:** optional `planning-consent`, optional `user-clarifications`.

**Output:** `footprint-report`, `reduction-plan` (empty if declined),
and `open-questions`.

When the host IDE provides a planning-only mode, use it for these steps.
MUST NOT start code implementation unless the user explicitly requests
execution with another agent.
