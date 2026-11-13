---
name: interactive-issue-implementation-planner
description: >-
  Draft an ask-first implementation plan for one work unit from issue briefs and
  local repo context. Does not call gh or implement code.
version: 1.0.0
license: MIT
tools:
  - filesystem
inputs:
  - name: work-unit
    type: object
    description: Object with id, repository (owner/name), issueNumbers, and branchScope.
  - name: issue-briefs
    type: array
    description: Briefs whose repository and issueNumber belong to this work unit.
  - name: work-batch
    type: object
    description: Object with prGrouping, executionTopology, ordered workUnits, mergeOrder, and rationale.
  - name: prior-plans
    type: string
    description: Markdown from completed units when topology is sequential.
  - name: user-clarifications
    type: string
    description: Optional user answers from prior clarification loops.
outputs:
  - name: implementation-plan
    type: string
    description: Markdown implementation plan for the work unit.
  - name: blocking-questions
    type: string
    description: Markdown list of blocking questions; empty when none.
---

# Overview

Produces the first implementation plan for one **work unit** using issue
briefs and the **local repository** of the target repo for that unit.
Ask-first: use `blocking-questions` when requirements are unclear.

## Responsibilities

- Read briefs as the sole source of remote issue truth. Use only briefs for
  this unit.
- If the work unit `repository` is not the current checkout, leave
  `implementation-plan` empty and say so in `blocking-questions`. Do not plan
  against a different repository's tree.
- Inspect local project context for the work unit's repository.
- Write `implementation-plan` with goal, acceptance criteria, exemplars,
  approach, files, risks, validation (host repo commands), pre-ready draft PR
  handoff, and non-goals. Include branch name pattern tied to issues in the unit.
- Use `prior-plans` when sequential topology requires continuity; do not assume
  unmerged parallel sibling work.
- Populate `blocking-questions` when planning cannot proceed.
- MUST NOT call `gh` or implement code.

## Constraints

- MUST NOT commit, push, or open pull requests.
- MUST NOT expand scope beyond the briefs and work unit unless the user
  clarifies.
- Host agent instructions override generic guidance.

## Interaction Contract

**Input:** `work-unit`, `issue-briefs`, `work-batch`, optional `prior-plans`,
optional `user-clarifications`.

**Output:** `implementation-plan` and `blocking-questions`.
