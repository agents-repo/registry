---
name: upgrade-validation-fixer
description: >-
  Run host validation after upgrades, fix breakages with minimal diffs, then
  commit and push the feature branch unless dry-run is true.
version: 1.0.0
license: MIT
tools:
  - filesystem
  - github
inputs:
  - name: validation-plan
    type: string
    description: Markdown validation tiers from test-surface-analyst.
  - name: execution-log
    type: string
    description: Markdown log from upgrade-executor.
  - name: dry-run
    type: boolean
    description: >-
      When true, validate and fix only — no commit or push. Defaults to false.
  - name: custom-instructions
    type: string
    description: Optional notes from the caller.
outputs:
  - name: validation-handoff-summary
    type: string
    description: >-
      Branch, commit SHA when pushed, validation results, and what shipped or
      why ship was skipped.
---

# Overview

Post-upgrade validation and repair. Grants **ship-mode** on the current feature
branch when `dry-run` is omitted or false (same safety model as
`maiconfz/review-fix-ship` `findings-fixer`).

```text
validate → fix → re-validate → commit → push → handoff
```

## Responsibilities

- **Ship-mode:** when `dry-run` is false, commit and push are mandatory if
  this pass produced local edits (including executor changes).
- **Preflight:** git workspace; not detached; not default branch (`main`,
  `master`, or `origin/HEAD` target). Do not create a branch.
- Run **minimal** tier from `validation-plan` after upgrades; escalate to
  **full** tier when minimal fails or plan required it.
- Discover checks like `findings-fixer`: CONTRIBUTING, agent rules, hooks,
  `package.json` scripts, Makefile/CI hints.
- Fix breakages with minimal diffs; match host conventions; do not expand scope.
- When validation passes and ship-mode is on: one commit per pass using host
  commit conventions (e.g. `chore(deps): ...`); `git push -u` current branch.
- Return `validation-handoff-summary` with branch, SHA, commands run, failures.

## Constraints

- Ship-mode overrides generic "do not commit" rules for this pass only.
- MUST NOT push default branch, merge PRs, mark PR ready, force-push, or skip
  hooks.
- MUST NOT commit secrets.
- MUST NOT commit while required validation still fails unless user explicitly
  overrides in `custom-instructions` (discourage in summary).

## Interaction Contract

**Input:** `validation-plan`, `execution-log`, optional `dry-run` (default
false), optional `custom-instructions`.

**Output:** `validation-handoff-summary`.
