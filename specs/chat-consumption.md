# Chat Consumption Specification (1.0.0)

This document defines the **chat-web** consumption channel: versioned
instruction manifests, path contracts for registry-proxy consumers, and
opt-in rules for packages, agents, and flows.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be
interpreted as described in RFC 2119.

## Scope

Chat-web consumption is **universal**: one path (and one `.agent.md` body)
per logical instruction (agent or flow). Platform differences are limited
to consumer UX; this spec defines URLs/paths and manifests only.

Install-target deployment ZIPs are defined in `install-targets.md`. Chat-web
artifacts are **version-directory sidecars** and MUST NOT be bundled inside
deployment ZIPs unless a future spec revision requires it.

## Consumer origin

WebApp consumers resolve **absolute fetch URLs** by joining:

- **Origin:** `https://registry.agents-repo.org`
- **Path:** path-only strings from `instructions.json` and related contracts
  below (MUST NOT include a scheme or host in registry-built artifacts).

Example absolute URL (illustrative):

```text
https://registry.agents-repo.org/pkg/agents-repo/hello-agent/1.0.0/agents/planner.agent.md
```

## `/pkg/` path contract

All chat-web fetch paths in registry artifacts MUST use the **`/pkg/`**
prefix. `/pkg/` aliases **published version snapshots** only; consumers MUST
NOT map `/pkg/` to package working trees.

Path templates (path-only, leading slash):

| Resource | Template |
| --- | --- |
| Agent instruction | `/pkg/<namespace>/<package-id>/<version>/agents/<agent-id>.agent.md` |
| Flow instruction | `/pkg/<namespace>/<package-id>/<version>/flows/<flow-id>.agent.md` |
| Instructions manifest | `/pkg/<namespace>/<package-id>/<version>/instructions.json` |

`<namespace>`, `<package-id>`, and entry ids MUST satisfy package naming
rules in `package-format.md`.

## Version resolution

- **Pinned version:** substitute `<version>` in path templates.
- **Latest:** consumers MUST read `packages/index.json` `latest` for the
  package, or `versions/manifest.json` `latest`, then substitute that version
  into path templates.

## Package opt-in (`metadata.json`)

Packages MAY declare consumption channels under `compatibility.consumption`:

```json
{
  "compatibility": {
    "canonicalFormat": "agents-repo.agent-instruction@1.0.0",
    "targets": [
      { "id": "cursor", "status": "supported" }
    ],
    "consumption": [
      {
        "id": "chat-web",
        "status": "supported",
        "defaultInstruction": {
          "kind": "agent",
          "id": "hello-agent"
        }
      }
    ]
  }
}
```

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `consumption` | array | no | Unique `id` values |
| `consumption[].id` | string | yes | MUST be `chat-web` (MVP) |
| `consumption[].status` | string | yes | `supported` or `planned` |
| `consumption[].defaultInstruction` | object | no | Only on `chat-web` entries with `status: "supported"` |
| `consumption[].defaultInstruction.kind` | string | yes (when parent present) | `agent` or `flow` |
| `consumption[].defaultInstruction.id` | string | yes (when parent present) | Lowercase kebab-case; MUST match an included instruction for that version |

When `defaultInstruction` is omitted, consumers MUST fall back to the first
entry in `instructions[]` (see [Consumer behavior](#consumer-behavior)).

`defaultInstruction` MUST NOT appear when chat-web is absent or `status` is
`planned`. Tooling MUST fail validation when `defaultInstruction` references
an agent or flow that is missing or excluded from `instructions.json`.

When `compatibility` is omitted, tooling MUST NOT emit chat-web artifacts.
`planned` MUST NOT produce `instructions.json` or index `chatWeb`.

## Agent and flow opt-in (`*.metadata.json`)

Optional field on agent and flow metadata:

| Field | Type | Constraints |
| --- | --- | --- |
| `chatWeb` | string | `included` or `excluded` |

Inclusion resolution:

| Package `chat-web` | Child `chatWeb` | In `instructions.json`? |
| --- | --- | --- |
| absent or `planned` | omitted | No |
| absent or `planned` | `included` | — (validation error) |
| absent or `planned` | `excluded` | No (no error) |
| `supported` | omitted | Yes |
| `supported` | `included` | Yes |
| `supported` | `excluded` | No |

Tooling MUST fail validation when `chatWeb: "included"` appears on an agent
or flow while the package does not declare `chat-web` with `supported`.

## `instructions.json`

### Location

Exactly **one** file per released package version:

```text
packages/<namespace>/<package-id>/versions/<version>/instructions.json
```

`package-build` MUST write this file only when the package declares
`chat-web` as `supported` **and** at least one agent or flow resolves as
included for that version.

### Schema version lifecycle

`schemaVersion` identifies the instructions manifest **format** version.

| Version | Status | Notes |
| --- | --- | --- |
| `1.0.0` | supported | Initial chat-web manifest |
| `1.1.0` | current | Optional `defaultInstruction` |

Tooling MUST use `specs/schema-versions.json` family `instructions.manifest`.

### Top-level schema

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `schemaVersion` | string | yes | Supported `instructions.manifest` version |
| `package` | string | yes | Qualified id `namespace/package-id` |
| `version` | string | yes | MUST equal snapshot version |
| `defaultInstruction` | object | no | Same shape as authoring; MUST match an entry in `instructions[]` when present |
| `instructions` | array | yes | Sorted ascending by `kind` then `id` |

### Instruction entry

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `kind` | string | yes | `agent` or `flow` |
| `id` | string | yes | Agent or flow id |
| `path` | string | yes | Path-only `/pkg/...` to this entry's `.agent.md` |
| `agentInstructions` | array of string | no | Flow only; path-only `/pkg/...` to step agents |

For flows, when `agents[]` is declared in flow frontmatter and/or flow
metadata (values MUST match when both present per `flow-format.md`),
`agentInstructions` MUST list the `/pkg/...` paths for each referenced
agent in order. When `agents[]` is absent, `agentInstructions` MUST be
omitted (Level-1 flow path only).

### Canonical example

Package `agents-repo/hello-agent` version `1.0.2` with two agents and one
flow; `hello-agent` is the declared default (not `hello-again`, which sorts
first in `instructions[]`):

```json
{
  "schemaVersion": "1.1.0",
  "package": "agents-repo/hello-agent",
  "version": "1.0.2",
  "defaultInstruction": {
    "kind": "agent",
    "id": "hello-agent"
  },
  "instructions": [
    {
      "kind": "agent",
      "id": "hello-again",
      "path": "/pkg/agents-repo/hello-agent/1.0.2/agents/hello-again.agent.md"
    },
    {
      "kind": "agent",
      "id": "hello-agent",
      "path": "/pkg/agents-repo/hello-agent/1.0.2/agents/hello-agent.agent.md"
    },
    {
      "kind": "flow",
      "id": "hello-agents",
      "path": "/pkg/agents-repo/hello-agent/1.0.2/flows/hello-agents.agent.md",
      "agentInstructions": [
        "/pkg/agents-repo/hello-agent/1.0.2/agents/hello-agent.agent.md",
        "/pkg/agents-repo/hello-agent/1.0.2/agents/hello-again.agent.md"
      ]
    }
  ]
}
```

## `manifest.json` recording

When `instructions.json` is emitted for a version, `versions/manifest.json`
MUST record:

| Field | Type | Constraints |
| --- | --- | --- |
| `instructionsArtifact` | string | MUST be `instructions.json` |
| `instructionsSha256` | string | SHA-256 of file bytes |

When chat-web is not active for a version, both fields MUST be absent.
See `manifest-schema.md`.

## `packages/index.json` projection

When the package declares `chat-web` as `supported` and the **latest**
manifest version entry includes `instructionsArtifact`, the index entry
MUST include `"chatWeb": true`. Otherwise `chatWeb` MUST be omitted.
See `index-schema.md`.

## Consumer behavior

When opening chat for a package version, consumers SHOULD resolve the
initial instruction as follows:

1. When `defaultInstruction` is present in `instructions.json` (or the
   top-level `defaultInstruction` field in `detail.json` when already
   loaded), select the matching `instructions[]` entry by `kind` and `id`.
2. When `defaultInstruction` is absent, select `instructions[0]` (first
   entry after the canonical sort order).

Consumers MUST NOT change `instructions[]` sort order based on
`defaultInstruction`.

## End-to-end example (paths)

| Artifact | Path-only value |
| --- | --- |
| Planner body | `/pkg/agents-repo/hello-agent/1.0.0/agents/planner.agent.md` |
| Manifest | `/pkg/agents-repo/hello-agent/1.0.0/instructions.json` |

Absolute WebApp fetch (illustrative):

```text
https://registry.agents-repo.org/pkg/agents-repo/hello-agent/1.0.0/instructions.json
```
