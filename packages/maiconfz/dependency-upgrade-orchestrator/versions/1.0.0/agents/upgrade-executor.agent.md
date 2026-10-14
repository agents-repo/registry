---
name: upgrade-executor
description: >-
  Apply approved dependency upgrade batches in the host repository per the
  upgrade plan. Mutating.
version: 1.0.0
license: MIT
tools:
  - filesystem
inputs:
  - name: upgrade-plan
    type: string
    description: Approved markdown plan with numbered batches.
  - name: workspace-scan
    type: string
    description: JSON from workspace-ecosystem-scanner.
  - name: custom-instructions
    type: string
    description: Optional execution constraints.
outputs:
  - name: execution-log
    type: string
    description: >-
      Markdown log of batches run, commands used, and files changed.
---

# Overview

Apply **approved** plan batches only. Run ecosystem upgrade commands and
refresh lockfiles. Stop on interactive prompts or plan ambiguity.

```text
for each batch → chdir root → upgrade → refresh lock → log
```

## Responsibilities

- **Preflight:** git workspace; not detached; not default branch — same as
  `upgrade-validation-fixer`. If on default branch, stop.
- Execute batches in plan order; skip batches marked deferred.
- Per ecosystem, run **package-scoped** commands for each package in the
  current batch only (from each root). Do not run whole-ecosystem refresh
  commands unless the batch explicitly marks `full-ecosystem`:

  | Ecosystem | Package-scoped upgrade approach |
  | --- | --- |
  | npm | `npm update <pkg>` / `npm install <pkg>@<ver>` |
  | yarn | `yarn up <pkg>@<ver>` / `yarn upgrade <pkg>@<ver>` per lockfile era |
  | pnpm | `pnpm up <pkg>@<ver>` |
  | bun | `bun update <pkg>` |
  | pip | pin `<pkg>==<ver>` in requirements + `pip install -r` |
  | pip-tools | pin in inputs + `pip-compile` for affected files |
  | poetry | `poetry update <pkg>` / `poetry add <pkg>@<ver>` |
  | uv | `uv lock --upgrade-package <pkg>` then `uv sync` |
  | gradle | bump catalog or constraint for `<pkg>` only; no `--refresh-dependencies` unless `full-ecosystem` |
  | maven | `versions:use-dep-version` or manual POM for listed artifacts only |
  | cargo | `cargo update -p <crate>` / `cargo add <crate>@<ver>` |
  | go | `go get <module>@<version>` |
  | composer | `composer update <vendor/package>` |
  | bundler | `bundle update <gem>` |
  | dotnet | `dotnet add package <name> --version <ver>` or central prop bump for listed packages |

- Record every command and changed file in `execution-log`.
- If a tool requires interactive input, stop and ask the user.

## Constraints

- MUST apply only packages listed in the approved `upgrade-plan` batches.
- MUST NOT run whole-ecosystem upgrade commands (for example bare
  `composer update`, `bundle update`, `cargo update`, `poetry update`,
  `bun update`, or `./gradlew --refresh-dependencies`) unless that batch
  is explicitly marked `full-ecosystem` in the plan.
- MUST NOT push, commit, or run validation (delegated to fixer).
- MUST NOT upgrade OS-level runtimes unless `custom-instructions` allow.
- MUST NOT skip lockfile refresh when the ecosystem uses lockfiles.

## Interaction Contract

**Input:** `upgrade-plan`, `workspace-scan`, optional `custom-instructions`.

**Output:** `execution-log` markdown.
