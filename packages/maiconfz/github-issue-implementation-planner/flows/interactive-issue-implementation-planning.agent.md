---
name: interactive-issue-implementation-planning
description: >-
  Ask-first GitHub issue planning for one or many issues with batch and per-unit
  refine loops. Planning only.
version: 1.0.0
license: MIT
agents:
  - github-issue-intake
  - work-batch-planner
  - interactive-issue-implementation-planner
  - interactive-implementation-plan-refiner
inputs:
  - name: issue-references
    type: string
    description: One or more issue numbers or full GitHub issue URLs.
  - name: repository
    type: string
    description: Optional target repository as owner/name when not inferable.
  - name: pr-grouping
    type: string
    description: Optional override per-issue, related, or single.
  - name: execution-topology
    type: string
    description: Optional override sequential or parallel.
  - name: user-clarifications
    type: string
    description: Optional user answers accumulated across clarification loops.
outputs:
  - name: refined-implementation-plan
    type: string
    description: Final markdown plan with batch header and per-unit sections.
  - name: open-questions
    type: string
    description: Remaining questions; blocking items first.
  - name: assumption-log
    type: string
    description: Always empty in interactive mode.
---

# Overview

End-to-end **ask-first** issue planning: intake, batch decisions, plan and refine
each work unit, assemble one handoff document.

```text
intake → batch → [unit: plan ↔ refine] → assemble → handoff
```

## Steps

1. **Intake** — Invoke `github-issue-intake`. If `intake-errors` is non-empty,
   ask the user to fix references or, when some briefs loaded, ask whether to
   continue with those only. Repeat intake once after correction. On `gh` auth
   failure, report `gh auth status` guidance.

2. **Batch** — Invoke `work-batch-planner` with `planning-mode: interactive`.
   If `blocking-questions` is non-empty, ask the user, append to
   `user-clarifications`, and repeat batch (max three Q&A cycles).

3. **Units** — For each work unit in order:
   - Invoke `interactive-issue-implementation-planner` with `prior-plans` when
     topology is sequential.
   - While `blocking-questions` is non-empty, ask the user, update
     `user-clarifications`, and repeat planner (max three cycles per unit).
   - Sequential topology: if blockers remain after three cycles, stop the whole
     flow and hand off partial output.
   - Parallel topology: park that unit's questions and continue other units.
   - Invoke `interactive-implementation-plan-refiner`. Loop on blocking
     `open-questions` like the planner (max three cycles).

4. **Assemble** — Build `refined-implementation-plan` with a batch header from
   `work-batch` and one section per refined unit.

5. **Handoff** — Present plan, `open-questions`, empty `assumption-log`. State
   that implementation requires an explicit request.

MUST NOT implement code unless explicitly requested.

## Error Handling

- **Pull request instead of issue:** Stop during intake; ask for issues.
- **Closed issue:** Ask whether to plan it before adding a unit.
- **Revision escalation:** After three cycles on the same blocker set, stop
  looping per unit rules above.

## Interaction Contract

**Input:** `issue-references`, optional `repository`, optional `pr-grouping`,
optional `execution-topology`, optional `user-clarifications`.

**Output:** `refined-implementation-plan`, `open-questions`, `assumption-log`.
