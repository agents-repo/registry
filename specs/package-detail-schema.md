# Package Detail Schema Specification (1.0.0)

This document defines the generated `detail.json` format used by
webapp package pages and other consumers that need latest-snapshot
package detail without enumerating package directories.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Schema Version Lifecycle

`schemaVersion` identifies the detail **format** version, not the package
release version and not the spec document version (`1.0.0`).

| Version | Applies To | Status | Notes |
| --- | --- | --- | --- |
| `1.0.0` | package.detail schemaVersion | current | Initial release |

Tooling MUST reject detail files whose `schemaVersion` is not in the table
above unless it explicitly supports a newer schema version.

Tooling MUST use `specs/schema-versions.json` as the machine-readable source
of truth for supported, deprecated, and end-of-life `schemaVersion` values.

## Purpose

`packages/<namespace>/<package-id>/detail.json` is a generated aggregate of
the **latest published snapshot**. Consumers MAY fetch this single file
instead of reading `metadata.json`, `README.md`, agent/flow sidecars, and
`versions/manifest.json` separately.

`detail.json` MUST NOT be projected into `packages/index.json`. Index
entries remain summary-only per `index-schema.md`.

## File Location

- The file MUST be stored at `packages/<namespace>/<package-id>/detail.json`.
- The file MUST be valid UTF-8 encoded JSON.
- Contributors and AI agents MUST NOT manually create or modify
  `detail.json`. Tooling (`package-build` and `package-index-rebuild`)
  MUST generate it.
- Source archives and deployment ZIPs MUST NOT include `detail.json`.

## Generation Source

Tooling MUST build `detail.json` from the latest published snapshot:

- Package metadata from `versions/<latest>/metadata.json`
- README markdown from `versions/<latest>/README.md` when that file exists
- Agent summaries from `versions/<latest>/agents/*.metadata.json`
- Flow summaries from `versions/<latest>/flows/*.metadata.json`
- Version list from `versions/manifest.json`

Tooling MUST NOT use package-root working-state files as the source for
these fields, except that `package-build` copies package-root `README.md`
into the new snapshot before generating detail.

## Top-Level Schema

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `schemaVersion` | string | yes | MUST be a supported `package.detail` schema version from `specs/schema-versions.json` |
| `package` | string | yes | Qualified id `namespace/package-id` |
| `version` | string | yes | MUST equal `versions/manifest.json` `latest` |
| `metadata` | object | yes | Snapshot package `metadata.json` |
| `readmeMarkdown` | string | no | Omitted when the latest snapshot has no `README.md` |
| `agents` | array | yes | MAY be empty |
| `flows` | array | yes | MAY be empty |
| `versions` | object | yes | See [Versions object](#versions-object) |
| `chatWeb` | boolean | no | `true` when chat-web is enabled for latest |
| `instructionsPath` | string | no | Path-only `/pkg/.../instructions.json` when `chatWeb` is `true` |

## Agent and flow entries

Each `agents[]` and `flows[]` item MUST be an object with:

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `id` | string | yes | Lowercase kebab-case id |
| `name` | string | yes | MUST match sidecar `name` |
| `description` | string | yes | MUST match sidecar `description` |
| `status` | string | yes | MUST match sidecar `status` |
| `category` | string | yes | MUST match sidecar `category` |
| `estimateCost` | object | yes | MUST match sidecar `estimateCost` |
| `instructionPath` | string | yes | Repo-relative path to the snapshot `.agent.md` |
| `agents` | array of string | no | Flow only; sidecar `agents[]` when present |

`instructionPath` MUST use the form:

```text
packages/<namespace>/<package-id>/versions/<version>/agents/<id>.agent.md
packages/<namespace>/<package-id>/versions/<version>/flows/<id>.agent.md
```

`detail.json` MUST NOT embed full `.agent.md` bodies.

## Versions object

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `latest` | string | yes | MUST equal `manifest.json` `latest` |
| `entries` | array | yes | One object per `manifest.json` `versions[]` entry |

Each versions entry MUST include `version`, `createdAt`, `srcArtifact`, and
`artifacts[]` with `target` and `file`. It MUST NOT include checksum fields.
When the manifest entry has `instructionsArtifact`, the detail entry MUST
copy that field.

## Example

```json
{
  "schemaVersion": "1.0.0",
  "package": "agents-repo/hello-agent",
  "version": "1.0.1",
  "metadata": {
    "schemaVersion": "1.0.0",
    "name": "hello-agent",
    "description": "Hello Agent package scaffolded by package-create",
    "owner": "agents-repo"
  },
  "readmeMarkdown": "# hello-agent\n",
  "agents": [
    {
      "id": "hello-agent",
      "name": "hello-agent",
      "description": "Responds with a simple hello workflow",
      "status": "active",
      "category": "assistant",
      "estimateCost": { "estimatedCost": 1, "band": "minimal" },
      "instructionPath": "packages/agents-repo/hello-agent/versions/1.0.1/agents/hello-agent.agent.md"
    }
  ],
  "flows": [],
  "versions": {
    "latest": "1.0.1",
    "entries": [
      {
        "version": "1.0.1",
        "createdAt": "2026-06-08T02:09:56.363Z",
        "srcArtifact": "1.0.1-src.zip",
        "artifacts": [{ "target": "cursor", "file": "1.0.1-cursor.zip" }]
      }
    ]
  },
  "chatWeb": true,
  "instructionsPath": "/pkg/agents-repo/hello-agent/1.0.1/instructions.json"
}
```
