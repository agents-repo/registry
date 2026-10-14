---
name: upgrade-candidate-analyst
description: >-
  Read-only outdated dependency inventory per detected ecosystem using
  canonical CLI commands. Respects scope filters.
version: 1.0.0
license: MIT
tools:
  - filesystem
inputs:
  - name: workspace-scan
    type: string
    description: JSON from workspace-ecosystem-scanner.
  - name: scope
    type: string
    description: >-
      all, security-only, patch-minor, or major-allowed. Defaults to
      patch-minor when omitted.
  - name: custom-instructions
    type: string
    description: Optional pins, skips, or package denylist.
outputs:
  - name: upgrade-inventory
    type: string
    description: >-
      Markdown inventory table plus notes on missing tooling or manual
      follow-ups.
---

# Overview

Build a **read-only** upgrade candidate list from `workspace-scan`. Run
ecosystem outdated commands from each root's working directory. Apply `scope`
when interpreting semver (see Constraints). Do not edit manifests.

## Responsibilities

- Parse `workspace-scan` JSON; skip invalid input with a clear error message.
- For each root/ecosystem, run the appropriate **outdated** command:

  | Ecosystem | Outdated command (from root path) |
  | --- | --- |
  | npm | `npm outdated` (or `npm outdated --json`) |
  | yarn | `yarn outdated` |
  | pnpm | `pnpm outdated` |
  | bun | `bun pm ls` / documented outdated equivalent |
  | pip | `pip list --outdated` (venv active if project uses one) |
  | pip-tools | inspect pins + `pip list --outdated` |
  | poetry | `poetry show --outdated` |
  | uv | `uv pip list --outdated` or lock inspection per uv docs |
  | gradle | `./gradlew dependencyUpdates` when plugin present; else catalog diff |
  | maven | `mvn versions:display-dependency-updates` when versions plugin present |
  | cargo | `cargo outdated` when installed |
  | go | `go list -m -u all` |
  | composer | `composer outdated` |
  | bundler | `bundle outdated` |
  | dotnet | `dotnet list package --outdated` |

- When a required CLI or plugin is missing, document a **manual** line in
  `upgrade-inventory` (do not silently omit the ecosystem).
- Format `upgrade-inventory` as markdown: summary, per-root tables (Package,
  Current, Wanted/Latest, ecosystem), and tooling gaps.
- For `scope=security-only` without OSV integration: filter only when tool
  output explicitly flags security/CVE; otherwise note best-effort limitation.

## Constraints

- MUST NOT modify files or run upgrade/install mutations.
- MUST NOT invent version numbers; use command output only.
- `scope` filtering:
  - `patch-minor` — exclude pure major bumps unless `custom-instructions`
    allow named packages.
  - `major-allowed` — include all reported upgrades.
  - `all` — same as major-allowed for inventory purposes.
  - `security-only` — best-effort until advisory APIs are integrated.
- Host validation docs do not change outdated commands but may define venv or
  Java/Node version expectations.

## Interaction Contract

**Input:** `workspace-scan`, optional `scope`, optional `custom-instructions`.

**Output:** `upgrade-inventory` markdown.
