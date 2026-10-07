---
name: dependency-upgrade-planning
description: >-
  Planning-only dependency upgrade workflow: scan, optional remote dedup and
  migration research, inventory, and upgrade plan without executing changes.
version: 1.0.0
license: MIT
agents:
  - workspace-ecosystem-scanner
  - remote-upgrade-tracker
  - upgrade-candidate-analyst
  - upgrade-migration-researcher
  - test-surface-analyst
  - upgrade-planner
inputs:
  - name: scope
    type: string
    description: >-
      all, security-only, patch-minor, or major-allowed. Defaults to
      patch-minor when omitted.
  - name: ecosystems
    type: string
    description: Optional comma list to limit ecosystem scan.
  - name: allow-web-research
    type: boolean
    description: When true, run upgrade-migration-researcher.
  - name: enable-github
    type: boolean
    description: When true, run remote-upgrade-tracker GitHub leg.
  - name: enable-gitlab
    type: boolean
    description: When true, run remote-upgrade-tracker GitLab leg.
  - name: approved-plan
    type: string
    description: Optional plan to validate instead of drafting anew.
  - name: custom-instructions
    type: string
    description: Pins, skips, or monorepo roots.
outputs:
  - name: upgrade-inventory
    type: string
    description: Markdown outdated inventory.
  - name: upgrade-plan
    type: string
    description: Markdown upgrade plan for user approval.
  - name: remote-collision-report
    type: string
    description: Remote dedup report or skipped note.
---

# Overview

Audit and plan without mutating the host repository. Use before running
`dependency-upgrade-orchestration` with `approved-plan` and `dry-run`.

```text
scan → remote? → inventory → research? → tests → plan → handoff
```

## Steps

1. **Preflight** — Same git workspace checks as orchestration (host repo; not
   default branch not required for read-only plan, but warn if on default
   branch that execute will need a feature branch).
2. **Scan** — `workspace-ecosystem-scanner`.
3. **Remote (optional)** — `remote-upgrade-tracker` when flags set; else
   skipped report.
4. **Inventory** — `upgrade-candidate-analyst`.
5. **Research (optional)** — `upgrade-migration-researcher` when
   `allow-web-research` is true.
6. **Validation map** — `test-surface-analyst`.
7. **Plan** — `upgrade-planner`; present `upgrade-plan`. Tell user to run
   `dependency-upgrade-orchestration` with `approved-plan`, `dry-run: true`
   first, then ship with `dry-run: false` after review. Suggest
   `maiconfz/plan-refiner` for large plans.

## Error Handling

- Same non-fatal remote/research failures as orchestration.
- **Zero ecosystems:** stop with guidance.
- MUST NOT invoke `upgrade-executor` or `upgrade-validation-fixer`.

## Interaction Contract

**Input:** optional `scope`, `ecosystems`, `allow-web-research`,
`enable-github`, `enable-gitlab`, `approved-plan`, `custom-instructions`.

**Output:** `upgrade-inventory`, `upgrade-plan`, `remote-collision-report`.
