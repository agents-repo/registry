# Flow Format Specification (1.0.0)

This document defines the deterministic format for flows
within a package.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Schema Version Lifecycle

This specification defines flow file format and rules. It does not define
a JSON `schemaVersion` field.

| Version | Applies To | Status | Notes |
| --- | --- | --- | --- |
| `1.0.0` | spec document version | current | Initial release |

Tooling and processes that validate flow format SHOULD use the latest
supported spec document version in this table.

## Required Files

Each flow `<flow-id>` MUST include:

- `flows/<flow-id>.agent.md`
- `flows/<flow-id>.metadata.json`

The `<flow-id>` stem MUST be identical for both files.

## Flow File Structure

`<flow-id>.agent.md` MUST start with YAML frontmatter followed by
markdown body content.

Frontmatter required fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `name` | string | MUST equal `<flow-id>` (stem before `.agent.md`) |
| `description` | string | 1 to 300 characters |
| `version` | string | Semantic version |
| `license` | string | MUST be `MIT` |

Frontmatter optional fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `agents` | array of string | Agent IDs referenced by this flow |
| `inputs` | array of `Contract` | Flow input contracts |
| `outputs` | array of `Contract` | Flow output contracts |

### Contract Object Schema

Each item in `inputs[]` and `outputs[]` MUST be an object with
exactly these fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `name` | string | 1 to 64 characters; `^[a-z][a-z0-9_-]*$` |
| `type` | string | `string`, `number`, `boolean`, `object`, or `array` |
| `description` | string | 1 to 300 characters |

Additional `Contract` rules:

- `Contract` objects MUST NOT contain fields other than `name`, `type`,
  and `description`.
- Within `inputs[]`, each `name` MUST be unique.
- Within `outputs[]`, each `name` MUST be unique.
- Ordering of `inputs[]` and `outputs[]` is significant and MUST be
  preserved as authored.

Body sections required in order:

1. `# Overview`
2. `## Steps`
3. `## Error Handling`
4. `## Interaction Contract`

## Relationship Rules

- `<flow-id>.agent.md` frontmatter `name` MUST equal `<flow-id>`.
- `<flow-id>.agent.md` frontmatter `name` MUST equal
  `<flow-id>.metadata.json` `name`.
- `<flow-id>.agent.md` frontmatter `license` MUST equal `MIT`.
- When `description` is present in both frontmatter and
  `<flow-id>.metadata.json`, the values MUST be identical.
- When `agents` is present in both frontmatter and
  `<flow-id>.metadata.json`, the values MUST be identical.
- When `inputs` is present in both frontmatter and
  `<flow-id>.metadata.json`, the values MUST be identical.
- When `outputs` is present in both frontmatter and
  `<flow-id>.metadata.json`, the values MUST be identical.
- Each `agents[]` entry SHOULD reference an `<agent-id>`
  present in `agents/` within the same package.
- `<flow-id>.metadata.json` fields are defined in
  `metadata-schema.md`.
- `<flow-id>.metadata.json` MUST include `status`, `category`, and
  `estimateCost`.
- For package root `flows/<flow-id>.agent.md`, frontmatter `version`
  MUST follow the root working-copy consistency rules defined in
  `versioning-rules.md`.

## ZIP Bundle Rules

- Each `versions/<version>/<version>.zip` is a deployment artifact
  for extraction into a project's `.github/` folder.
- Within `versions/<version>/<version>.zip`, each bundled
  `agents/*.agent.md` frontmatter `version` MUST equal `<version>`.
- Flow `<flow-id>.agent.md` files are placed as
  `agents/<flow-id>.agent.md` in the ZIP because Copilot reads
  flows as agent instructions.
- `flows/<flow-id>.metadata.json` files MUST NOT be included.
- ZIP content file names MUST match exact case.

## Canonical Example

```markdown
---
name: triage
description: Routes incoming issues to the appropriate agent.
version: 1.0.0
license: MIT
agents:

    - planner
    - executor
---

# Overview

Route issue content through classification and response drafting.

## Steps

1. Classify issue category.
2. Select routing strategy.
3. Delegate to the appropriate agent.

## Error Handling

If classification fails, route to manual review.

## Interaction Contract

Input: issue title and body.
Output: structured route decision and delegated task assignments.
```
