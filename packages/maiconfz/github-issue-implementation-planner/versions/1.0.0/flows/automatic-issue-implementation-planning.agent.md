---
name: automatic-issue-implementation-planning
description: >-
  Assumption-first GitHub issue planning for one or many issues with batch
  defaults and one-shot per-unit refine. Planning only.
version: 1.0.0
license: MIT
agents:
  - github-issue-intake
  - work-batch-planner
  - automatic-issue-implementation-planner
  - automatic-implementation-plan-refiner
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
    description: Failures and unusable drafts; empty when the run completes.
  - name: assumption-log
    type: string
    description: Concatenated labeled assumptions from batch and units.
---

# Overview

End-to-end **automatic** issue planning: intake, assumption-first batch
decisions (default one PR per issue, sequential), one-shot plan and refine per
work unit.

```text
intake → batch → [unit: plan → refine] → assemble → handoff
```

## Steps

1. **Intake** — Invoke `github-issue-intake`. If `intake-errors` is non-empty
   and no briefs loaded, stop and list failures. If partial failure, stop without
   planning a quiet subset. On `gh` auth failure, report `gh auth status`.

2. **Batch** — Invoke `work-batch-planner` with `planning-mode: automatic`.
   Merge `assumption-log` into the running log. Do not loop on batch questions.

3. **Units** — For each work unit in order:
   - Pass only `issue-briefs` whose `repository` and `issueNumber` are on that
     unit (`id`, `repository`, `issueNumbers`, `branchScope`).
   - If that `repository` is not the current checkout, record the unit in
     `open-questions`. Sequential: stop. Parallel: continue other units. Do not
     read this tree as a stand-in.
   - Invoke `automatic-issue-implementation-planner` with `prior-plans` when
     sequential.
   - If `implementation-plan` is empty, stop the sequence (sequential) or record
     the failure in `open-questions` and continue (parallel).
   - Invoke `automatic-implementation-plan-refiner` once. Append unit
     `assumption-log`.

4. **Assemble** — Build `refined-implementation-plan` with batch header and per
   unit sections.

5. **Handoff** — Present plan, `open-questions`, and combined `assumption-log`.

MUST NOT implement code unless explicitly requested.

## Error Handling

- **Unreadable workspace:** Stop; surface in `open-questions`.
- **Rate limits:** Wait or ask the user to retry later; do not guess issue text.

## Interaction Contract

**Input:** `issue-references`, optional `repository`, optional `pr-grouping`,
optional `execution-topology`, optional `user-clarifications`.

**Output:** `refined-implementation-plan`, `open-questions`, `assumption-log`.
