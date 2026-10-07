---
name: dependency-upgrade-orchestration
description: >-
  Scan polyglot dependencies, plan upgrades ask-first, optionally dedupe remote
  work and research migrations, then upgrade, validate, fix, and ship on a
  feature branch.
version: 1.0.0
license: MIT
agents:
  - workspace-ecosystem-scanner
  - remote-upgrade-tracker
  - upgrade-candidate-analyst
  - upgrade-migration-researcher
  - test-surface-analyst
  - upgrade-planner
  - upgrade-executor
  - upgrade-validation-fixer
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
    description: When true, run upgrade-migration-researcher for major bumps.
  - name: enable-github
    type: boolean
    description: When true, run remote-upgrade-tracker GitHub leg when gh works.
  - name: enable-gitlab
    type: boolean
    description: When true, run remote-upgrade-tracker GitLab leg when available.
  - name: dry-run
    type: boolean
    description: >-
      When true in execute phase, validate and fix without commit or push.
      Recommended true for first execute pass.
  - name: approved-plan
    type: string
    description: >-
      Optional prior upgrade-plan markdown to resume; re-confirm approval if
      inventory drifted.
  - name: custom-instructions
    type: string
    description: Pins, skips, monorepo roots, or execution notes.
outputs:
  - name: upgrade-inventory
    type: string
    description: Markdown outdated inventory from upgrade-candidate-analyst.
  - name: upgrade-plan
    type: string
    description: Markdown plan from upgrade-planner.
  - name: remote-collision-report
    type: string
    description: Remote dedup report or explicit skipped note.
  - name: validation-handoff-summary
    type: string
    description: Final handoff from upgrade-validation-fixer when execute ran.
---

# Overview

Primary entry for **dependency-upgrade-orchestrator**. Runs discover → plan →
(user approval) → execute → validate/fix. Ship-mode on the host feature branch
when `dry-run` is false in the execute phase.

```text
scan → remote? → inventory → research? → tests → plan → approve → execute → fix
```

## Steps

1. **Preflight** — Confirm a git workspace in the **host** project. If HEAD is
   detached or the branch is the default branch, stop and ask the user to
   check out a feature branch. Read host `AGENTS.md` / `.cursor/rules/*` when
   present. Treat `scope` as `patch-minor` when omitted.
2. **Scan** — Invoke `workspace-ecosystem-scanner` with `ecosystems` and
   `custom-instructions`. If `roots` is empty, stop with guidance (wrong
   directory or no supported manifests).
3. **Remote (optional)** — When `enable-github` or `enable-gitlab` is true,
   invoke `remote-upgrade-tracker`. Otherwise set `remote-collision-report` to
   `Remote tracking skipped (flags off).`
4. **Inventory** — Invoke `upgrade-candidate-analyst` with `workspace-scan` and
   `scope`. Capture `upgrade-inventory`.
5. **Research (optional)** — When `allow-web-research` is true, invoke
   `upgrade-migration-researcher`; else set `migration-notes` empty for the
   planner.
6. **Validation map** — Invoke `test-surface-analyst` with `workspace-scan` and
   `upgrade-inventory`.
7. **Plan** — Invoke `upgrade-planner` with scan, inventory, validation plan,
   remote report, migration notes, optional `approved-plan`, and `scope`. Present
   `upgrade-plan` to the user. **Stop until explicit approval** to execute. If
   `approved-plan` was supplied and planner flagged inventory drift, require
   re-approval.
8. **Execute (after approval)** — Invoke `upgrade-executor` with approved
   `upgrade-plan` and `workspace-scan`.
9. **Validate and ship** — Invoke `upgrade-validation-fixer` with
   `validation-plan`, `execution-log`, and `dry-run`. Return
   `validation-handoff-summary`.

## Error Handling

- **Not a git repository:** stop; do not invent a workspace.
- **Default branch checkout:** stop; do not create a branch automatically.
- **Zero ecosystems:** stop after scan with actionable message.
- **Remote tracker fails:** log warning; continue with empty/skipped report.
- **Research unavailable:** continue without migration notes.
- **User declines plan:** stop without execute; return inventory and plan.
- **Executor interactive prompt:** stop and ask user; do not guess.
- **Validation fails:** fixer MUST NOT commit; surface failure in handoff.
- **Safety:** no secrets, no hook skip, no force-push, no merge/mark-ready.

## Interaction Contract

**Input:** optional `scope`, `ecosystems`, `allow-web-research`,
`enable-github`, `enable-gitlab`, `dry-run`, `approved-plan`,
`custom-instructions`.

**Output:** `upgrade-inventory`, `upgrade-plan`, `remote-collision-report`,
`validation-handoff-summary` (after execute phase).
