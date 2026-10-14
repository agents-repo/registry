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

1. **Preflight** — Confirm a git workspace in the **host** project (same
   host-repo checks as orchestration). A non-default branch is not required for
   this read-only planning flow; if HEAD is on the default branch, warn that
   `dependency-upgrade-orchestration` will stop until the user checks out a
   feature branch.
2. **Scan** — Invoke `workspace-ecosystem-scanner` with `ecosystems` and
   `custom-instructions`. If `roots` is empty, stop with guidance.
3. **Remote (optional)** — When `enable-github` or `enable-gitlab` is true,
   invoke `remote-upgrade-tracker` with scan context and flags; else set
   `remote-collision-report` to `Remote tracking skipped (flags off).`
4. **Inventory** — Invoke `upgrade-candidate-analyst` with `workspace-scan`,
   `scope`, and `custom-instructions`. Capture `upgrade-inventory`.
5. **Research (optional)** — When `allow-web-research` is true, invoke
   `upgrade-migration-researcher` with inventory and scan; else set
   migration notes empty for the planner.
6. **Validation map** — Invoke `test-surface-analyst` with `workspace-scan`
   and `upgrade-inventory`.
7. **Plan** — Invoke `upgrade-planner` with scan, inventory, validation plan,
   `remote-collision-report`, migration notes, optional `approved-plan`, and
   `scope`. Present `upgrade-plan`. Tell user to run
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
