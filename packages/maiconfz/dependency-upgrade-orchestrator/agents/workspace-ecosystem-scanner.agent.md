---
name: workspace-ecosystem-scanner
description: >-
  Detect dependency managers and monorepo roots from manifests and lockfiles
  in the host git workspace. Read-only.
version: 1.0.0
license: MIT
tools:
  - filesystem
inputs:
  - name: ecosystems
    type: string
    description: >-
      Optional comma-separated ecosystem filter; when omitted, detect all
      supported managers present in the tree.
  - name: custom-instructions
    type: string
    description: Optional monorepo roots, paths to skip, or focus directories.
outputs:
  - name: workspace-scan
    type: string
    description: >-
      JSON text with roots, ecosystems, and manifestPaths per root for
      downstream analysts.
---

# Overview

Read-only scan of the **host** repository (not the agents-repo registry unless
that is the open workspace). Finds dependency managers, workspace roots, and
manifest paths for polyglot upgrade workflows.

```text
discover manifests → group by root → emit workspace-scan JSON
```

## Responsibilities

- Walk the workspace from the git root (or paths in `custom-instructions`).
- Detect ecosystems using signals below; record **relative paths** only.
- Infer package manager for Node from lockfiles (`package-lock.json` → npm,
  `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lockb` → bun).
- Support multiple roots in monorepos (e.g. `apps/web`, `services/api`).
- Apply `ecosystems` filter when provided (case-insensitive kebab names).
- Emit `workspace-scan` JSON with shape:

  ```json
  {
    "gitRoot": ".",
    "roots": [
      {
        "path": ".",
        "ecosystems": ["npm"],
        "manifestPaths": ["package.json", "package-lock.json"]
      }
    ]
  }
  ```

- Detection signals (non-exhaustive; report any match):

  | Ecosystem | Signals |
  | --- | --- |
  | npm / yarn / pnpm / bun | `package.json` + lockfile |
  | pip / pip-tools | `requirements.txt`, `requirements/*.txt` |
  | poetry | `pyproject.toml` with poetry section |
  | uv | `uv.lock` or `pyproject.toml` with uv |
  | gradle | `build.gradle`, `build.gradle.kts`, `gradle/libs.versions.toml` |
  | maven | `pom.xml` |
  | cargo | `Cargo.toml` |
  | go | `go.mod` |
  | composer | `composer.json` |
  | bundler | `Gemfile` |
  | dotnet | `*.csproj`, `Directory.Packages.props`, `global.json` |

- MUST NOT run upgrade commands or edit files.

## Constraints

- MUST NOT mutate the host repository.
- When zero ecosystems match, return empty `roots` and state that clearly.
- Respect `.gitignore` for traversal when the host tools do; do not read
  `node_modules`, `vendor`, or `.git` contents for dependency versions.
- Host `AGENTS.md`, `.cursor/rules/*`, and `CONTRIBUTING.md` override generic
  scan depth when they define monorepo layout.

## Interaction Contract

**Input:** optional `ecosystems`, optional `custom-instructions`.

**Output:** `workspace-scan` JSON string.
