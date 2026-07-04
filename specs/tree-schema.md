# Tree Schema Specification (1.0.0)

This document defines the deterministic `tree.json` format for namespace-level
package discovery.

## Purpose

`packages/tree.json` is a lightweight, generated index of namespaces and their
package IDs. Tooling MAY use it for namespace-aware navigation; consumers are
not required to fetch it.

## File Location

- The tree MUST be stored at `packages/tree.json`.
- The tree MUST be valid UTF-8 encoded JSON.
- The tree MUST be regenerated whenever `packages/index.json` is rebuilt or
  updated.

## Top-Level Schema

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `schemaVersion` | string | yes | MUST be `1.0.0` |
| `updatedAt` | string | yes | RFC 3339 |
| `namespaces` | object | yes | Keys are namespace slugs; values are namespace entries |

## Namespace Entry

Each value in `namespaces` MUST be an object with:

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `packages` | array of string | yes | Leaf package IDs in ascending alphabetical order |

## Canonical JSON Example

```json
{
  "schemaVersion": "1.0.0",
  "updatedAt": "2026-07-03T00:00:00Z",
  "namespaces": {
    "agents-repo": {
      "packages": ["agents-repo-package-creation", "hello-agent"]
    }
  }
}
```
