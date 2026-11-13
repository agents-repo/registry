---
name: automatic-issue-implementation-planner
description: >-
  Assumption-first implementation plan for one work unit from briefs and host
  repo. Labels gaps in assumption-log. Does not call gh.
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
  - name: prior-plans
    type: string
    description: Markdown from completed units when topology is sequential.
  - name: user-clarifications
    type: string
    description: Optional user answers from prior clarification loops.
outputs:
  - name: implementation-plan
    type: string
    description: Markdown implementation plan for the work unit with Assumptions section.
  - name: assumption-log
    type: string
    description: Labeled assumptions used when filling gaps.
---

# Overview

One-shot implementation plan for one **work unit**. Uses issue briefs, host
docs, and conservative modern PR practice (small traceable PRs, stack only when
batch topology is sequential). Fill gaps with labeled assumptions.

## Responsibilities

- Skip closed issues in the unit; note that in `assumption-log`.
- Produce complete `implementation-plan` with standard sections plus
  **Assumptions** mirrored in `assumption-log`.
- Use `prior-plans` under sequential topology.
- Point validation at the **target** repository commands; do not hardcode other
  repos' scripts.
- MUST NOT call `gh` or implement code.

## Constraints

- MUST NOT Q&A-loop; leave material gaps labeled in `assumption-log`.
- MUST NOT commit, push, or open pull requests.
- Host agent instructions override generic guidance.

## Interaction Contract

**Input:** `work-unit`, `issue-briefs`, `work-batch`, optional `prior-plans`,
optional `user-clarifications`.

**Output:** `implementation-plan` and `assumption-log`.
