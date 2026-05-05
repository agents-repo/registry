# Index Schema Specification (1.0.0)

This document defines the deterministic `index.json` format
for the registry-level package index.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Schema Version Lifecycle

`schemaVersion` identifies the index **format** version, not the package
release version and not the spec document version (`1.0.0`).

| Version | Applies To | Status | Notes |
| --- | --- | --- | --- |
| `1.0.0` | index schemaVersion | current | Initial entry |

Tooling MUST reject index files whose `schemaVersion` is not in the table above
unless it explicitly supports a newer schema version.

## Purpose

`packages/index.json` is the machine-readable entry point for consumers
(such as a webapp) to discover all packages in the registry without
needing to enumerate the `packages/` directory.

## File Location

- The index MUST be stored at `packages/index.json`.
- The index MUST be valid UTF-8 encoded JSON.

## Top-Level Schema

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `schemaVersion` | string | yes | MUST be `1.0.0`; see [Schema Version Lifecycle](#schema-version-lifecycle) |
| `updatedAt` | string | yes | RFC 3339; MUST be updated when index changes |
| `packages` | array | yes | MAY be empty; one entry per package |

## Package Entry Schema

Each entry in `packages` MUST be an object with:

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `id` | string | yes | Package directory name; kebab-case |
| `name` | string | yes | MUST match `metadata.json` `name` |
| `description` | string | yes | MUST match `metadata.json` `description` |
| `latest` | string | yes | MUST equal `manifest.json` `latest` |
| `tags` | array of string | yes | MUST match `metadata.json` `tags` |

## Validation Rules

- `packages[].id` values MUST be unique within the index.
- `packages[].id` MUST satisfy `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- `packages[].latest` MUST equal the `latest` field in the
  corresponding `packages/<id>/versions/manifest.json`.
- `packages[].name`, `packages[].description`, and `packages[].tags`
  MUST reflect the current `packages/<id>/metadata.json` values.
- `updatedAt` MUST be updated whenever a package entry is added,
  modified, or removed.
- The index MUST contain one entry for every package directory under
  `packages/` that contains a `metadata.json`.
- The index MUST NOT contain entries for package IDs that do not
  exist as directories under `packages/`.
- `packages` SHOULD be sorted in ascending alphabetical order by `id`.

## Update Requirements

- When a new package is added to `packages/`, a corresponding entry
  MUST be added to `packages/index.json`.
- When a package publishes a new version, the corresponding entry's
  `latest` and any changed summary fields MUST be updated in
  `packages/index.json`.
- When a package is removed from `packages/`, its entry MUST be
  removed from `packages/index.json`.

## Canonical JSON Example

```json
{
    "schemaVersion": "1.0.0",
    "updatedAt": "2026-05-05T00:00:00Z",
    "packages": [
        {
            "id": "my-package",
            "name": "my-package",
            "description": "Multi-agent package for PR review automation.",
            "latest": "1.1.0",
            "tags": ["productivity", "review", "automation"]
        }
    ]
}
```
