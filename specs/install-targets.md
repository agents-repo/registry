# Install Targets Specification (1.0.0)

This document defines install target identifiers, artifact naming, and ZIP
layouts for multi-tool agent instruction packages.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be
interpreted as described in RFC 2119.

## Install Target IDs

| ID | Consumer | ZIP layout root |
| --- | --- | --- |
| `github-copilot` | GitHub Copilot | `agents/<id>.agent.md` in ZIP (extract under `.github/`; flows flattened) |
| `claude-code` | Claude Code | `.claude/agents/<id>.md` |
| `cursor` | Cursor | `.cursor/skills/<id>/SKILL.md` |
| `openai-codex` | OpenAI Codex | `.agents/skills/<id>/SKILL.md` |

Tooling MUST treat these IDs as the canonical install target identifiers.

## Artifact Naming

Each published version MUST emit one deployment ZIP per declared install
target that is not `planned`:

- Filename: `<version>-<target-id>.zip`
- Example: `1.0.0-cursor.zip`

There MUST NOT be a legacy `<version>.zip` deployment artifact.

## Source Archive

Each version MUST also include `<version>-src.zip` containing the canonical
package source tree for auditing. This archive is not an install target.

## metadata.json compatibility

Packages MAY declare tooling compatibility in `metadata.json`:

```json
{
  "compatibility": {
    "canonicalFormat": "agents-repo.agent-instruction@1.0.0",
    "targets": [
      { "id": "github-copilot", "status": "supported" },
      { "id": "cursor", "status": "supported" }
    ]
  }
}
```

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `canonicalFormat` | string | no | Defaults to `agents-repo.agent-instruction@1.0.0` |
| `targets` | array | yes when `compatibility` present | Non-empty; unique `id` values |

Target entry:

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `id` | string | yes | One of the install target IDs above |
| `status` | string | yes | `supported`, `experimental`, or `planned` |

When `compatibility` is omitted, tooling MUST assume all four targets are
`supported` and MUST build artifacts for each non-`planned` target.

`planned` targets MUST NOT receive build artifacts.

## Artifact paths

Published artifacts are stored under namespaced package directories:

```text
packages/<namespace>/<package-id>/versions/<version>/<version>-<target-id>.zip
```

Example: `packages/agents-repo/hello-agent/versions/1.0.0/1.0.0-cursor.zip`

## manifest.json artifacts

Each `versions[]` entry MUST include `artifacts[]` instead of legacy
`artifact` / `sha256` fields:

```json
{
  "target": "cursor",
  "file": "1.0.0-cursor.zip",
  "sha256": "<64-char-lowercase-hex>"
}
```

## packages/index.json installTargets

The registry index projects install targets for catalog consumers:

```json
{
  "installTargets": [
    { "id": "github-copilot", "status": "supported" },
    { "id": "cursor", "status": "experimental" }
  ]
}
```

Only `supported` and `experimental` targets with built artifacts are
included. `planned` targets MUST NOT appear in the index.

## Uninstall semantics

CLI `remove` (and compatible tooling) MUST uninstall packages by deleting
the same on-disk paths that install extract creates for each install target.
Path mapping is the inverse of extract: ZIP entry names are mapped with the
same rules as install (including the `github-copilot` remap from `agents/`
to `.github/agents/`).

| Install target ID | Extract root (project or global home) | Prune boundary (do not remove) |
| --- | --- | --- |
| `github-copilot` | Project root or `AGENTS_REPO_HOME` | `.github/`, `.github/agents/` |
| `claude-code` | Project root or `AGENTS_REPO_HOME` | `.claude/`, `.claude/agents/` |
| `cursor` | Project root or `AGENTS_REPO_HOME` | `.cursor/`, `.cursor/skills/` |
| `openai-codex` | Project root or `AGENTS_REPO_HOME` | `.agents/`, `.agents/skills/` |

Tooling MUST derive delete paths by listing file entries in the **locked**
target artifact ZIP (not from `agents.json` ranges). After deleting files,
tooling MAY remove empty parent directories up to—but MUST NOT remove—the
prune boundary directory for that target (for example remove
`.cursor/skills/my-skill/` when empty, but never `.cursor/skills/` itself).

When a path is missing, tooling SHOULD warn and continue (idempotent
uninstall). When a path exists but is not a regular file, or its content
no longer matches the ZIP entry, tooling SHOULD warn and skip deletion
unless the user passes an explicit force flag defined in the CLI
`command-contracts.md`.

See [agents-repo CLI `cli-protocol.md` remove
pipeline](https://github.com/agents-repo/cli/blob/main/specs/cli-protocol.md).
