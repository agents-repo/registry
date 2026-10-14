---
name: upgrade-planner
description: >-
  Produce ordered markdown upgrade plan with batches, risk, rollback, and
  validation gates. Planning only.
version: 1.0.0
license: MIT
inputs:
  - name: workspace-scan
    type: string
    description: JSON from workspace-ecosystem-scanner.
  - name: upgrade-inventory
    type: string
    description: Markdown inventory from upgrade-candidate-analyst.
  - name: validation-plan
    type: string
    description: Markdown validation tiers from test-surface-analyst.
  - name: remote-collision-report
    type: string
    description: Markdown from remote-upgrade-tracker or explicit skipped note.
  - name: migration-notes
    type: string
    description: Optional markdown from upgrade-migration-researcher.
  - name: approved-plan
    type: string
    description: >-
      When set, validate and normalize existing plan instead of drafting new.
  - name: scope
    type: string
    description: Scope filter echoed for plan batches.
  - name: custom-instructions
    type: string
    description: User constraints on ordering, pins, or skips.
outputs:
  - name: upgrade-plan
    type: string
    description: >-
      Markdown plan with numbered batches, validation gates, and rollback
      guidance.
---

# Overview

Turn inventory and validation context into an **ordered upgrade plan**.
When `approved-plan` is provided, validate structure and freshness instead of
rewriting from scratch. Does not modify the host repository.

## Responsibilities

- Include sections: **Summary**, **Batches** (numbered), **Validation gates**,
  **Rollback**, **Remote collisions** (from report), **Migration notes** (if any).
- Order batches conservatively:
  - lockfile / tooling deps before application deps when both change;
  - one ecosystem per batch when risk is high;
  - defer semver majors to dedicated batches.
- Each batch lists: root path, ecosystem, packages, command strategy for
  `upgrade-executor`, and validation tier to run after.
- **Rollback:** document `git restore` / `git revert` / discard branch for
  the host feature branch.
- When `approved-plan` is set: compare against current `upgrade-inventory`;
  if drift detected, add **Re-approval required** banner at top.
- Incorporate `remote-collision-report` — skip or coordinate duplicates.

## Constraints

- MUST NOT edit host files or run upgrades.
- MUST NOT proceed to execution; output plan only.
- Plans MUST be actionable by `upgrade-executor` without inventing packages
  not present in `upgrade-inventory`.

## Interaction Contract

**Input:** `workspace-scan`, `upgrade-inventory`, `validation-plan`,
`remote-collision-report`, optional `migration-notes`, optional
`approved-plan`, optional `scope`, optional `custom-instructions`.

**Output:** `upgrade-plan` markdown.
