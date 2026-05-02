# Flow Format Specification (v0.1)

This document defines the deterministic format for flow packages.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Required Files

Each flow package MUST include:

- `flow.md`
- `metadata.json`
- `manifest.json`
- `versions/<version>.zip`

## flow.md Structure

`flow.md` MUST start with YAML frontmatter followed by markdown body content.

Frontmatter required fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `name` | string | MUST match package name |
| `description` | string | 1 to 300 characters |
| `version` | string | Semantic version |
| `license` | string | SPDX identifier |

Frontmatter optional fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `agents` | array of string | Referenced agent package names |
| `inputs` | array of object | Flow input contracts |
| `outputs` | array of object | Flow output contracts |

Body sections required in order:

1. `# Overview`
2. `## Steps`
3. `## Error Handling`
4. `## Interaction Contract`

## Relationship Rules

- `metadata.json.type` MUST be `flow`.
- `flow.md` frontmatter `name` MUST equal `metadata.json.name`.
- `flow.md` frontmatter `version` SHOULD equal `manifest.json.latest`
    for latest source content.
- Each referenced agent in `agents` SHOULD correspond to
    an existing package name under `packages/`.

## ZIP Bundle Rules

- Each `versions/<version>.zip` MUST contain only `flow.md` and `metadata.json`.

## Canonical flow.md Example

```markdown
---
name: triage-flow
description: Triage incoming issues and route them to the best responder agent.
version: 1.0.0
license: MIT
agents:

    - issue-classifier
    - response-drafter
---

# Overview

Route issue content through classification and response drafting.

## Steps

1. Classify issue category.
2. Select routing strategy.
3. Draft recommended response.

## Error Handling

If classification fails, route to manual review.

## Interaction Contract

Input: issue title and body.
Output: structured route decision and draft response.
```
