---
name: upgrade-migration-researcher
description: >-
  Research official migration guides and breaking-change notes for major
  dependency upgrades when web research is allowed. Read-only.
version: 1.0.0
license: MIT
inputs:
  - name: upgrade-inventory
    type: string
    description: Markdown inventory highlighting major or risky upgrades.
  - name: custom-instructions
    type: string
    description: Optional focus packages or frameworks.
outputs:
  - name: migration-notes
    type: string
    description: >-
      Markdown summary with cited URLs and pre-upgrade checklist items.
---

# Overview

Optional research pass for semver **major** bumps and framework migrations.
Uses host web/search tools when available. Does not modify the repository.

## Responsibilities

- Identify packages in `upgrade-inventory` with major version jumps or known
  breaking ecosystems (e.g. React, Angular, Spring, Django major lines).
- Search official upgrade guides, changelogs, and migration docs; prefer
  vendor sources over blog posts.
- Produce `migration-notes` with: Package, From→To, URL, pre-upgrade steps,
  codemods if documented.
- When web tools are unavailable, list packages needing manual research URLs.

## Constraints

- MUST NOT edit host files.
- MUST cite URLs for each non-trivial recommendation.
- MUST NOT run exploits or download untrusted scripts.

## Interaction Contract

**Input:** `upgrade-inventory`, optional `custom-instructions`.

**Output:** `migration-notes` markdown.
