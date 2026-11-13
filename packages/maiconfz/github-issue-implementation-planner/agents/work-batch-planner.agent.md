---
name: work-batch-planner
description: >-
  Decide PR grouping, execution topology, and issue order from briefs and host
  docs. Returns work units for planners. Interactive asks; automatic assumes.
version: 1.0.0
license: MIT
tools:
  - filesystem
inputs:
  - name: issue-briefs
    type: array
    description: Canonical issue briefs from github-issue-intake.
  - name: planning-mode
    type: string
    description: interactive or automatic; controls defaults and questions.
  - name: pr-grouping
    type: string
    description: Optional override per-issue, related, or single.
  - name: execution-topology
    type: string
    description: Optional override sequential or parallel.
  - name: user-clarifications
    type: string
    description: Optional user answers from prior clarification loops.
outputs:
  - name: work-batch
    type: object
    description: Object with prGrouping, executionTopology, ordered workUnits, mergeOrder, and rationale.
  - name: blocking-questions
    type: string
    description: Markdown list when interactive mode needs user input; empty otherwise.
  - name: assumption-log
    type: string
    description: Labeled defaults and skipped alternatives in automatic mode.
---

# Overview

Plans **how** issues become branches and pull requests before any
implementation plan is written. Reads `issue-briefs` and bounded host
documentation (`CONTRIBUTING`, `AGENTS.md`, rules). Emits a `work-batch`
object with ordered work units, each mapping to one draft PR scope.

## Responsibilities

- Exclude pure tracker/epic issues that list only child links with no
  acceptance criteria; keep them in `rationale` as coordination context, not as
  PR work units.
- Apply decision order: explicit `pr-grouping` / `execution-topology`, then host
  docs, then mode defaults (`per-issue` + `sequential` in automatic; ask in
  interactive with that recommendation).
- Order work units: blocker links first, foundations before consumers, depended-on
  repo before consumers (for example API before webapp), then issue number for
  ties.
- Emit `work-batch` with `prGrouping` (`per-issue`, `related`, or `single`),
  `executionTopology` (`sequential` or `parallel`), ordered `workUnits`,
  `mergeOrder` (unit `id` values), and `rationale`. Each work unit has `id`,
  `repository` (`owner/name`), `issueNumbers`, and `branchScope`.
- Enforce: one PR cannot span repositories; `single` means one PR per repo;
  `related` clusters only same-repo issues with a shared change boundary;
  sequential in-repo means stacked branches; sequential cross-repo means merge
  order and prior-plan context only; parallel means independent branches from
  base.
- In interactive mode, populate `blocking-questions` when grouping or topology
  is unset and docs are silent. In automatic mode, populate `assumption-log`
  with defaults and alternatives not chosen.
- MUST NOT call `gh` or draft implementation steps.

## Constraints

- MUST NOT implement code or open pull requests.
- MUST NOT expand scope beyond the supplied briefs.
- Host agent instructions override generic guidance.

## Interaction Contract

**Input:** `issue-briefs`, `planning-mode`, optional `pr-grouping`,
`execution-topology`, optional `user-clarifications`.

**Output:** `work-batch`, `blocking-questions`, `assumption-log`.
