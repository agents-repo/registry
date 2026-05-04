# Metadata Schema Specification (v0.1)

This document defines the deterministic metadata contracts
for packages, agents, and flows.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Package Metadata

### File Location

- Package metadata MUST be stored as `packages/<package-id>/metadata.json`.
- A verbatim snapshot MUST also be stored at
  `packages/<package-id>/versions/<version>/metadata.json` for every
  released version.
- The package root `metadata.json` MUST reflect the package's current working
  state. It MAY include unreleased changes prior to publication. The package
  root `metadata.json` is not the authoritative historical source for any
  specific released version. The released copy for each version is preserved
  at `packages/<package-id>/versions/<version>/metadata.json`.
- The authoritative metadata for a specific version is
  `versions/<version>/metadata.json` inside the version snapshot folder.
  See `specs/package-format.md` for the full working-state invariants.
- All metadata files MUST be valid UTF-8 encoded JSON.

### Required Fields

| Field | Type | Constraints |
| --- | --- | --- |
| `name` | string | MUST match package directory name |
| `description` | string | 1 to 300 characters |
| `owner` | string | GitHub owner or organization slug |
| `license` | string | MUST be `MIT` |
| `homepage` | string | HTTPS URL |
| `repository` | string | HTTPS URL to repository |
| `tags` | array of string | 1 to 20 lowercase tags |
| `createdAt` | string | RFC 3339 timestamp |
| `updatedAt` | string | RFC 3339 timestamp |

### Optional Fields

| Field | Type | Constraints |
| --- | --- | --- |
| `maintainers` | array of string | GitHub usernames or team slugs |
| `compatibility` | object | Tooling and runtime compatibility |
| `documentation` | string | HTTPS URL |
| `keywords` | array of string | Additional searchable terms |

### Validation Rules

- `name` MUST match the package directory name exactly.
- `license` MUST equal `MIT`.
- `updatedAt` MUST be greater than or equal to `createdAt`.
- Arrays MUST NOT contain duplicate values.
- Unknown fields SHOULD use the `x-` prefix for extensions.

### Canonical Example

```json
{
    "name": "my-package",
    "description": "Multi-agent package for PR review automation.",
    "owner": "agents-repo",
    "license": "MIT",
    "homepage": "https://github.com/agents-repo/my-package",
    "repository": "https://github.com/agents-repo/my-package",
    "tags": ["productivity", "review", "automation"],
    "createdAt": "2026-05-02T00:00:00Z",
    "updatedAt": "2026-05-02T00:00:00Z"
}
```

## Agent Metadata

### File Location

- Agent metadata MUST be stored as
  `agents/<agent-id>.metadata.json`.
- The `<agent-id>` stem MUST match the corresponding
  `<agent-id>.agent.md`.
- File MUST be valid UTF-8 encoded JSON.

### Required Fields

| Field | Type | Constraints |
| --- | --- | --- |
| `name` | string | MUST equal `<agent-id>` (stem before `.agent.md`) |
| `description` | string | 1 to 300 characters |
| `license` | string | MUST be `MIT` |

### Optional Fields

| Field | Type | Constraints |
| --- | --- | --- |
| `tools` | array of string | Declared tool capabilities |
| `inputs` | array of `Contract` | Input contracts; see `agent-format.md` |
| `outputs` | array of `Contract` | Output contracts; see `agent-format.md` |

### Validation Rules

- `name` MUST match the agent file stem exactly.
- `name` MUST also match the `name` field in
  `<agent-id>.agent.md` frontmatter.
- `license` MUST equal `MIT`.
- When `description` is present in both this file and
  `<agent-id>.agent.md` frontmatter, the values MUST be identical.
- When `tools` is present in both this file and
  `<agent-id>.agent.md` frontmatter, the values MUST be identical.
- `inputs[]` and `outputs[]` items MUST conform to the `Contract`
  object schema defined in `agent-format.md`.
- When `inputs` is present in both this file and
  `<agent-id>.agent.md` frontmatter, the values MUST be identical.
- When `outputs` is present in both this file and
  `<agent-id>.agent.md` frontmatter, the values MUST be identical.
- Unknown fields SHOULD use the `x-` prefix.

### Canonical Example

```json
{
    "name": "planner",
    "description": "Plans the steps to complete a PR review task.",
    "license": "MIT",
    "tools": ["github", "filesystem"]
}
```

## Flow Metadata

### File Location

- Flow metadata MUST be stored as
  `flows/<flow-id>.metadata.json`.
- The `<flow-id>` stem MUST match the corresponding
  `<flow-id>.agent.md`.
- File MUST be valid UTF-8 encoded JSON.

### Required Fields

| Field | Type | Constraints |
| --- | --- | --- |
| `name` | string | MUST equal `<flow-id>` (stem before `.agent.md`) |
| `description` | string | 1 to 300 characters |
| `license` | string | MUST be `MIT` |

### Optional Fields

| Field | Type | Constraints |
| --- | --- | --- |
| `agents` | array of string | Agent IDs referenced in this flow |
| `inputs` | array of `Contract` | Flow input contracts; see `flow-format.md` |
| `outputs` | array of `Contract` | Flow outputs; see `flow-format.md` |

### Validation Rules

- `name` MUST match the flow file stem exactly.
- `name` MUST also match the `name` field in
  `<flow-id>.agent.md` frontmatter.
- `license` MUST equal `MIT`.
- When `description` is present in both this file and
  `<flow-id>.agent.md` frontmatter, the values MUST be identical.
- When `agents` is present in both this file and
  `<flow-id>.agent.md` frontmatter, the values MUST be identical.
- `inputs[]` and `outputs[]` items MUST conform to the `Contract`
  object schema defined in `flow-format.md`.
- When `inputs` is present in both this file and
  `<flow-id>.agent.md` frontmatter, the values MUST be identical.
- When `outputs` is present in both this file and
  `<flow-id>.agent.md` frontmatter, the values MUST be identical.
- Each `agents[]` entry SHOULD reference an `<agent-id>`
  present in `agents/`.
- Unknown fields SHOULD use the `x-` prefix.

### Canonical Example

```json
{
    "name": "triage",
    "description": "Routes incoming issues to the appropriate agent.",
    "license": "MIT",
    "agents": ["planner", "executor"]
}
```
