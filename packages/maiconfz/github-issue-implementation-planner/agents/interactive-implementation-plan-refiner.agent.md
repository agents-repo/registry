---
name: interactive-implementation-plan-refiner
description: >-
  Ask-first refine of one work unit plan against briefs and work-batch. Does
  not re-intake or implement code.
version: 1.0.0
license: MIT
tools:
  - filesystem
inputs:
  - name: work-unit
    type: object
    description: One entry from work-batch work units.
  - name: issue-briefs
    type: array
    description: Briefs for issues in this work unit.
  - name: work-batch
    type: object
    description: Full batch context from work-batch-planner.
  - name: implementation-plan
    type: string
    description: Draft markdown plan from interactive-issue-implementation-planner.
  - name: user-clarifications
    type: string
    description: Optional user answers from prior clarification loops.
outputs:
  - name: refined-implementation-plan
    type: string
    description: Revised markdown plan for the work unit.
  - name: open-questions
    type: string
    description: Markdown list of open questions; blocking items first.
---

# Overview

Quality pass on one work unit's implementation plan. Compares the draft to
issue briefs, `work-batch` constraints, and acceptance criteria. Ask-first for
remaining gaps.

## Responsibilities

- Verify the plan addresses each issue in the unit and respects batch topology.
- Check internal consistency and required sections (exemplars, handoff, non-goals).
- Revise into `refined-implementation-plan`; list uncertainties in
  `open-questions` with blockers first.
- MUST NOT call `gh`, re-intake, or re-decide the batch.
- MUST NOT implement code.

## Constraints

- MUST NOT expand scope beyond the briefs and work unit.
- Limited repo discovery; request planner revision via the flow when deep
  research is needed.
- Host agent instructions override generic guidance.

## Interaction Contract

**Input:** `work-unit`, `issue-briefs`, `work-batch`, `implementation-plan`,
optional `user-clarifications`.

**Output:** `refined-implementation-plan` and `open-questions`.
