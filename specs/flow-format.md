# Flow Format Specification (v0.1)

This document defines the deterministic format for flows
within a package.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Required Files

Each flow `<flow-id>` MUST include:

- `flows/<flow-id>.md`
- `flows/<flow-id>.metadata.json`

The stem `<flow-id>` MUST be identical for both files.

## Flow File Structure

`<flow-id>.md` MUST start with YAML frontmatter followed by
markdown body content.

Frontmatter required fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `name` | string | MUST match `<flow-id>` stem |
| `description` | string | 1 to 300 characters |
| `version` | string | Semantic version |
| `license` | string | SPDX identifier |

Frontmatter optional fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `agents` | array of string | Agent IDs referenced by this flow |
| `inputs` | array of object | Flow input contracts |
| `outputs` | array of object | Flow output contracts |

Body sections required in order:

1. `# Overview`
2. `## Steps`
3. `## Error Handling`
4. `## Interaction Contract`

## Relationship Rules

- `<flow-id>.md` frontmatter `name` MUST match the file stem.
- `<flow-id>.md` frontmatter `name` MUST equal
  `<flow-id>.metadata.json` `name`.
- Each `agents[]` entry SHOULD reference an `<agent-id>`
  present in `agents/` within the same package.
- `<flow-id>.metadata.json` fields are defined in
  `metadata-schema.md`.

## ZIP Bundle Rules

- Each `versions/<version>.zip` is a deployment artifact for
  extraction into a project's `.github/` folder.
- Flow `.md` files are placed as `agents/<flow-id>.md` in the ZIP
  because Copilot reads flows as agent instructions.
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
