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
