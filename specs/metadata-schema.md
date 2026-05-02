# Metadata Schema Specification (v0.1)

This document defines the deterministic metadata contract
for agent and flow packages.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## File Location

- Metadata MUST be stored at package root as `metadata.json`.
- Metadata MUST be valid UTF-8 encoded JSON.

## Required Fields

| Field | Type | Constraints |
| --- | --- | --- |
| `name` | string | MUST match package directory name |
| `type` | string | MUST be `agent` or `flow` |
| `description` | string | 1 to 300 characters |
| `owner` | string | GitHub owner or organization slug |
| `license` | string | SPDX identifier, SHOULD be `MIT` |
| `homepage` | string | HTTPS URL |
| `repository` | string | HTTPS URL to repository |
| `tags` | array of string | 1 to 20 lowercase tags |
| `createdAt` | string | RFC 3339 timestamp |
| `updatedAt` | string | RFC 3339 timestamp |

## Optional Fields

| Field | Type | Constraints |
| --- | --- | --- |
| `maintainers` | array of string | GitHub usernames or team slugs |
| `compatibility` | object | Tooling and runtime compatibility metadata |
| `documentation` | string | HTTPS URL |
| `keywords` | array of string | Additional searchable terms |

## Validation Rules

- Unknown fields MAY be present but SHOULD be prefixed under `x-` for extensions.
- `name` and package folder name MUST match exactly.
- `type` MUST match package content (`agent.md` for `agent`, `flow.md` for `flow`).
- `updatedAt` MUST be greater than or equal to `createdAt`.
- Arrays MUST NOT contain duplicate values.

## Canonical JSON Example

```json
{
    "name": "my-agent",
    "type": "agent",
    "description": "Summarizes pull request feedback into actionable tasks.",
    "owner": "agents-repo",
    "license": "MIT",
    "homepage": "https://github.com/agents-repo/registry",
    "repository": "https://github.com/agents-repo/registry",
    "tags": ["productivity", "review", "automation"],
    "createdAt": "2026-05-02T00:00:00Z",
    "updatedAt": "2026-05-02T00:00:00Z"
}
```
