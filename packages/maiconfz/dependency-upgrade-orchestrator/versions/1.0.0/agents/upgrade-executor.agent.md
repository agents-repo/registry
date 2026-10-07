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
- Per ecosystem upgrade commands (from each root):

  | Ecosystem | Upgrade approach |
  | --- | --- |
  | npm | `npm update <pkg>` / `npm install pkg@ver` |
  | yarn | `yarn up` / `yarn upgrade` per lockfile era |
  | pnpm | `pnpm up` |
  | bun | `bun update` |
  | pip | edit requirements + `pip install -r` |
  | pip-tools | edit inputs + `pip-compile` |
  | poetry | `poetry update` / `poetry add` |
  | uv | `uv lock --upgrade-package` / `uv sync` |
  | gradle | bump catalog or constraints; `./gradlew --refresh-dependencies` |
  | maven | controlled `versions:*` goals or manual POM edits |
  | cargo | `cargo update` / `cargo add` |
  | go | `go get package@version` |
  | composer | `composer update` |
  | bundler | `bundle update` |
  | dotnet | `dotnet add package` / central package prop bumps |

- Record every command and changed file in `execution-log`.
- If a tool requires interactive input, stop and ask the user.

## Constraints

- MUST apply only packages listed in the approved `upgrade-plan`.
- MUST NOT push, commit, or run validation (delegated to fixer).
- MUST NOT upgrade OS-level runtimes unless `custom-instructions` allow.
- MUST NOT skip lockfile refresh when the ecosystem uses lockfiles.

## Interaction Contract

**Input:** `upgrade-plan`, `workspace-scan`, optional `custom-instructions`.

**Output:** `execution-log` markdown.
