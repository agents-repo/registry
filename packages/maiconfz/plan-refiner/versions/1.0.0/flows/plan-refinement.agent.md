---
name: plan-refinement
description: >-
  Route an existing plan to interactive (ask-first) or automatic
  (assumption-first) refinement with a full repository pass. Planning only.
version: 1.0.0
license: MIT
agents:
  - interactive-plan-refiner
  - automatic-plan-refiner
inputs:
  - name: draft-plan
    type: string
    description: Draft plan as markdown text or a workspace path to a markdown file.
  - name: refine-mode
    type: string
    description: interactive or automatic; ask which to use when missing.
  - name: goal
    type: string
    description: Optional stated goal or acceptance text to check the plan against.
  - name: user-clarifications
    type: string
    description: Optional user answers accumulated across clarification loops.
outputs:
  - name: refined-plan
    type: string
    description: Revised markdown plan after the selected refiner finishes.
  - name: open-questions
    type: string
    description: Remaining questions at handoff; blocking items first when present.
  - name: assumption-log
    type: string
    description: Assumptions from automatic mode; empty after interactive refine.
---

# Overview

Catalog entry for this package. Take an **already written** plan, resolve
`refine-mode`, and route to exactly one refiner. Interactive prefers
questions; automatic fills gaps with labeled assumptions. Both run a
bounded host-repo pass. Planning only.

```text
check draft-plan → resolve refine-mode → invoke one agent →
(interactive loop: carry refined-plan) → write-back → handoff
```

This flow does not draft a first plan and does not intake GitHub issues.

## Steps

1. **Draft** — If `draft-plan` is missing or empty, ask for markdown or
   a plan-file path and stop.

2. **Mode** — If `refine-mode` is not `interactive` or `automatic`, ask
   which to use. Do not default.

3. **Refine** — Invoke the matching agent with the working `draft-plan`,
   `goal`, and `user-clarifications`. On the first pass, that working
   value is the user input.

4. **Interactive loop** — Only for `interactive-plan-refiner`. If
   `open-questions` has **blockers**, ask the user, append answers to
   `user-clarifications`, and repeat step 3. On each repeat, pass the
   latest `refined-plan` as `draft-plan` when it is non-empty; do not
   re-feed the original pasted markdown. Remember the original workspace
   path, if `draft-plan` started as a path, for write-back. Max
   **three** Q&A cycles. Then copy leftover questions into
   `open-questions`. Do not loop `automatic-plan-refiner`.

5. **Write-back** — If a source plan file is known (remembered original
   path or the host's current plan file) and `refined-plan` is
   non-empty, update that file only. The invoked agent also performs
   write-back; do not write any other host files.

6. **Handoff** — Present `refined-plan`, remaining `open-questions`, and
   `assumption-log`. State that product implementation needs an explicit
   request or a different agent.

When the host IDE provides a planning-only mode, use it for these steps.
MUST NOT start product implementation unless the user explicitly requests
a different agent.

## Error Handling

- **Unreadable or empty host workspace:** Stop. Do not invent a
  codebase.
- **Path in `draft-plan` does not exist or is not markdown:** Ask for a
  valid path or pasted plan.
- **User supplies an issue URL or number instead of a plan:** Stop.
  Point at `maiconfz/github-interactive-issue-implementation-planner`.
  Do not invoke that package from this flow.
- **Automatic returns `open-questions` because the workspace is
  unreadable:** Do not loop. Surface the questions and stop.
- **Same blockers after three interactive cycles:** Stop looping. Hand
  off the partial plan and leftover questions. Write-back only the
  portions already safe to keep.
- **User asks to implement during this flow:** Refuse. This package is
  plan-only.

## Interaction Contract

**Input:** `draft-plan`, optional `refine-mode`, optional `goal`,
optional `user-clarifications`.

**Output:** `refined-plan`, `open-questions`, and `assumption-log`.
