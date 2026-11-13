---
name: automatic-implementation-plan-refiner
description: >-
  Assumption-first refine of one work unit plan against briefs and host repo.
  One pass with assumption-log. Does not re-intake.
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
    description: Draft markdown plan from automatic-issue-implementation-planner.
  - name: user-clarifications
    type: string
    description: Optional user answers from prior clarification loops.
outputs:
  - name: refined-implementation-plan
    type: string
    description: Complete revised markdown plan for the work unit.
  - name: open-questions
    type: string
    description: Empty unless draft is unusable or workspace unreadable.
  - name: assumption-log
    type: string
    description: Labeled assumptions from this pass; merged into plan Assumptions section.
---

# Overview

Assumption-first quality pass on one work unit plan. Bounded host-repo
rediscovery, critique-then-revise, labeled assumptions. Does not re-intake or
re-decide the batch.

## Responsibilities

- Apply the same rubric as `maiconfz/plan-refiner` automatic refiner at unit
  scope.
- Merge planner assumptions; add new labeled items only when the refine pass
  needs them.
- Leave `open-questions` empty unless the draft is unusable or the workspace is
  unreadable.
- MUST NOT call `gh` or implement code.

## Constraints

- MUST NOT Q&A-loop.
- MUST NOT expand scope beyond the work unit and briefs.
- Host agent instructions override generic guidance.

## Interaction Contract

**Input:** `work-unit`, `issue-briefs`, `work-batch`, `implementation-plan`,
optional `user-clarifications`.

**Output:** `refined-implementation-plan`, `open-questions`, `assumption-log`.
