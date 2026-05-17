# Metadata Schema Specification (1.0.0)

This document defines the deterministic metadata contracts
for packages, agents, and flows.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Package Metadata

### Schema Version Lifecycle

`schemaVersion` identifies the package metadata **format** version, not the
package release version and not the spec document version (`1.0.0`).

| Version | Applies To | Status | Notes |
| --- | --- | --- | --- |
| `1.0.0` | package metadata schemaVersion | current | Includes WebApp fields |

Tooling MUST reject package metadata whose `schemaVersion` is not in the
table above unless it explicitly supports a newer schema version.

Tooling MUST use `specs/schema-versions.json` as the machine-readable source of
truth for supported, deprecated, and end-of-life `schemaVersion` values.

Lifecycle enforcement:

- `schemaVersion` values marked `deprecated` SHOULD produce a warning.
- `schemaVersion` values marked `eol` MUST be rejected.
- New packages SHOULD use the current schema version.
- Existing packages MAY continue using older supported versions.

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
| `schemaVersion` | string | MUST be a supported `metadata.package` schema version from `specs/schema-versions.json`; see [Schema Version Lifecycle](#schema-version-lifecycle) |
| `name` | string | MUST match package directory name |
| `description` | string | 1 to 300 characters |
| `owner` | string | GitHub owner or organization slug |
| `license` | string | MUST be `MIT` |
| `homepage` | string | HTTPS URL |
| `repository` | string | HTTPS URL to repository |
| `tags` | array of string | 1 to 20 lowercase tags |
| `createdAt` | string | RFC 3339 timestamp |
| `updatedAt` | string | RFC 3339 timestamp |
| `version` | string | Semver (`MAJOR.MINOR.PATCH`); current release target |

### Status Lifecycle Semantics

The `status` field communicates lifecycle meaning for package, agent, and flow
metadata. Consumers MUST interpret these values consistently.

| Status | Semantic Meaning | Consumer Behavior |
| --- | --- | --- |
| `active` | Maintained and recommended for new use. | Included by default. |
| `deprecated` | Available but discouraged. | Included with warning. |
| `archived` | Historical/repro use only. | Not recommended by default. |
| `yanked` | Withdrawn for serious concerns. | Excluded by default. |

Status handling requirements:

- Producers MUST emit one valid status value for each package, agent, and flow
  metadata document.
- Consumers MUST preserve the exact status value during reads/writes and
  projections.
- Status semantics apply uniformly to package metadata, agent metadata, and flow
  metadata.
- Consumers SHOULD include `active` in default discovery and recommendations.
- Consumers SHOULD include `deprecated` in default discovery and SHOULD surface
  a warning.
- Migration guidance for `deprecated` SHOULD be provided in package
  documentation when applicable.
- Consumers MAY include `archived` in discovery but SHOULD NOT recommend it by
  default.
- Consumers MUST exclude `yanked` from default listings and recommendations
  unless explicitly requested by ID or equivalent direct lookup.

Additional required fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `status` | string | MUST be `active`, `deprecated`, `archived`, or `yanked` |
| `category` | string | Non-empty string |
| `estimateOverallCost` | object | MUST follow `EstimateOverallCost` schema |

### Optional Fields

| Field | Type | Constraints |
| --- | --- | --- |
| `maintainers` | array of string | GitHub usernames or team slugs |
| `compatibility` | object | Tooling and runtime compatibility |
| `documentation` | string | HTTPS URL |
| `keywords` | array of string | Additional searchable terms |
| `quickstart` | string | HTTPS URL |
| `customAttributes` | object | Arbitrary key-value map for detail rendering |

Additional optional fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `estimateOverallCost.estimatedCost` | number | MAY be non-negative estimate |

### EstimateOverallCost Object Schema

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `band` | string | yes | MUST be `low`, `medium`, `high`, or `mixed` |
| `estimatedCost` | number | no | Non-negative numeric aggregate estimate |

### Validation Rules

- `name` MUST match the package directory name exactly.
- `license` MUST equal `MIT`.
- `updatedAt` MUST be greater than or equal to `createdAt`.
- `version` MUST be a valid semantic version in the format
  `MAJOR.MINOR.PATCH` with no pre-release or build metadata suffixes.
- `version` MUST be greater than or equal to `versions/manifest.json`
  `latest` when the manifest exists for the package.
- Arrays MUST NOT contain duplicate values.
- `status`, `category`, and `estimateOverallCost.band` are required.
- `estimateOverallCost.band` MUST be one of `low`, `medium`, `high`, or
  `mixed`.
- `estimateOverallCost.estimatedCost`, when present, MUST be a non-negative
  number.
- `quickstart`, when present, MUST be an HTTPS URL.
- `customAttributes`, when present, MUST be an object.
- Unknown fields SHOULD use the `x-` prefix for extensions.

### Canonical Example

```json
{
    "schemaVersion": "1.0.0",
    "name": "my-package",
    "description": "Multi-agent package for PR review automation.",
    "owner": "agents-repo",
    "license": "MIT",
    "homepage": "https://github.com/agents-repo/my-package",
    "repository": "https://github.com/agents-repo/my-package",
    "tags": ["productivity", "review", "automation"],
    "createdAt": "2026-05-02T00:00:00Z",
    "updatedAt": "2026-05-02T00:00:00Z",
    "version": "1.0.0",
    "status": "active",
    "category": "automation",
    "estimateOverallCost": {
      "band": "mixed"
    },
    "quickstart": "https://github.com/agents-repo/my-package#quickstart"
}
```

## Agent Metadata

### Schema Version Lifecycle

`schemaVersion` identifies the agent metadata **format** version, not the
package release version and not the spec document version (`1.0.0`).

| Version | Applies To | Status | Notes |
| --- | --- | --- | --- |
| `1.0.0` | agent metadata schemaVersion | current | Includes WebApp fields |

Tooling MUST reject agent metadata whose `schemaVersion` is not in the
table above unless it explicitly supports a newer schema version.

Tooling MUST use `specs/schema-versions.json` as the machine-readable source of
truth for supported, deprecated, and end-of-life `schemaVersion` values.

Lifecycle enforcement:

- `schemaVersion` values marked `deprecated` SHOULD produce a warning.
- `schemaVersion` values marked `eol` MUST be rejected.
- New packages SHOULD use the current schema version.
- Existing packages MAY continue using older supported versions.

### File Location

- Agent metadata MUST be stored as
  `agents/<agent-id>.metadata.json`.
- The `<agent-id>` stem MUST match the corresponding
  `<agent-id>.agent.md`.
- File MUST be valid UTF-8 encoded JSON.

### Required Fields

| Field | Type | Constraints |
| --- | --- | --- |
| `schemaVersion` | string | MUST be a supported `metadata.agent` schema version from `specs/schema-versions.json`; see [Schema Version Lifecycle](#schema-version-lifecycle-1) |
| `name` | string | MUST equal `<agent-id>` (stem before `.agent.md`) |
| `description` | string | 1 to 300 characters |
| `license` | string | MUST be `MIT` |

Additional required fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `status` | string | MUST be `active`, `deprecated`, `archived`, or `yanked` |
| `category` | string | Non-empty string |
| `estimateCost` | object | MUST follow `EstimateCost` schema |

### Optional Fields

| Field | Type | Constraints |
| --- | --- | --- |
| `tools` | array of string | Declared tool capabilities |
| `inputs` | array of `Contract` | Input contracts; see `agent-format.md` |
| `outputs` | array of `Contract` | Output contracts; see `agent-format.md` |
| `customAttributes` | object | Arbitrary key-value map for detail rendering |

### EstimateCost Object Schema (Shared: Agent and Flow)

This object schema applies to both agent metadata `estimateCost` and
flow metadata `estimateCost`.

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `estimatedCost` | number | yes | Numeric estimate |
| `band` | string | yes | MUST be `low`, `medium`, or `high` |

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
- `status`, `category`, and `estimateCost` are required.
- `estimateCost.estimatedCost` MUST be a number.
- `estimateCost.band` MUST be one of `low`, `medium`, or `high`.
- `customAttributes`, when present, MUST be an object.
- Unknown fields SHOULD use the `x-` prefix.

### Canonical Example

```json
{
    "schemaVersion": "1.0.0",
    "name": "planner",
    "description": "Plans the steps to complete a PR review task.",
    "license": "MIT",
    "status": "active",
    "category": "automation",
    "estimateCost": {
      "estimatedCost": 2,
      "band": "medium"
    },
    "tools": ["github", "filesystem"]
}
```

## Flow Metadata

### Schema Version Lifecycle

`schemaVersion` identifies the flow metadata **format** version, not the
package release version and not the spec document version (`1.0.0`).

| Version | Applies To | Status | Notes |
| --- | --- | --- | --- |
| `1.0.0` | flow metadata schemaVersion | current | Includes WebApp fields |

Tooling MUST reject flow metadata whose `schemaVersion` is not in the
table above unless it explicitly supports a newer schema version.

Tooling MUST use `specs/schema-versions.json` as the machine-readable source of
truth for supported, deprecated, and end-of-life `schemaVersion` values.

Lifecycle enforcement:

- `schemaVersion` values marked `deprecated` SHOULD produce a warning.
- `schemaVersion` values marked `eol` MUST be rejected.
- New packages SHOULD use the current schema version.
- Existing packages MAY continue using older supported versions.

### File Location

- Flow metadata MUST be stored as
  `flows/<flow-id>.metadata.json`.
- The `<flow-id>` stem MUST match the corresponding
  `<flow-id>.agent.md`.
- File MUST be valid UTF-8 encoded JSON.

### Required Fields

| Field | Type | Constraints |
| --- | --- | --- |
| `schemaVersion` | string | MUST be a supported `metadata.flow` schema version from `specs/schema-versions.json`; see [Schema Version Lifecycle](#schema-version-lifecycle-2) |
| `name` | string | MUST equal `<flow-id>` (stem before `.agent.md`) |
| `description` | string | 1 to 300 characters |
| `license` | string | MUST be `MIT` |

Additional required fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `status` | string | MUST be `active`, `deprecated`, `archived`, or `yanked` |
| `category` | string | Non-empty string |
| `estimateCost` | object | MUST follow `EstimateCost` schema |

### Optional Fields

| Field | Type | Constraints |
| --- | --- | --- |
| `agents` | array of string | Agent IDs referenced in this flow |
| `inputs` | array of `Contract` | Flow input contracts; see `flow-format.md` |
| `outputs` | array of `Contract` | Flow outputs; see `flow-format.md` |
| `customAttributes` | object | Arbitrary key-value map for detail rendering |

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
- `status`, `category`, and `estimateCost` are required.
- `estimateCost.estimatedCost` MUST be a number.
- `estimateCost.band` MUST be one of `low`, `medium`, or `high`.
- `customAttributes`, when present, MUST be an object.
- Unknown fields SHOULD use the `x-` prefix.

### Canonical Example

```json
{
    "schemaVersion": "1.0.0",
    "name": "triage",
    "description": "Routes incoming issues to the appropriate agent.",
    "license": "MIT",
    "status": "active",
    "category": "automation",
    "estimateCost": {
      "estimatedCost": 3,
      "band": "medium"
    },
    "agents": ["planner", "executor"]
}
```
