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
| `1.0.0` | index schemaVersion | current | Includes WebApp listing projection |

Tooling MUST reject index files whose `schemaVersion` is not in the table above
unless it explicitly supports a newer schema version.

Tooling MUST use `specs/schema-versions.json` as the machine-readable source of
truth for supported, deprecated, and end-of-life `schemaVersion` values.

Lifecycle enforcement:

- `schemaVersion` values marked `deprecated` SHOULD produce a warning.
- `schemaVersion` values marked `eol` MUST be rejected.
- New packages SHOULD use the current schema version.
- Existing packages MAY continue using older supported versions.

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
| `schemaVersion` | string | yes | MUST be a supported `index` schema version from `specs/schema-versions.json`; see [Schema Version Lifecycle](#schema-version-lifecycle) |
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
| `status` | string | yes | MUST match `metadata.json` `status` enum |
| `category` | string | yes | MUST match package `metadata.json` |
| `estimateOverallCost` | object | yes | Includes required `band` |
| `quickstart` | string | no | HTTPS URL |

`estimateOverallCost` object schema:

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `band` | string | yes | MUST be `minimal`, `low`, `moderate`, `high`, `critical`, or `mixed` |
| `estimatedCost` | number | no | Relative effort on a 1–10 scale (inclusive) |

## Validation Rules

- `packages[].id` values MUST be unique within the index.
- `packages[].id` MUST satisfy `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- `packages[].latest` MUST equal the `latest` field in the
  corresponding `packages/<id>/versions/manifest.json`.
- `packages[].name`, `packages[].description`, and `packages[].tags`
  MUST reflect the current `packages/<id>/metadata.json` values.
- `packages[].status`, `packages[].category`, and
  `packages[].estimateOverallCost` MUST reflect the current
  `packages/<id>/metadata.json` values.
- `packages[].status` semantics MUST follow `specs/metadata-schema.md`
  Status Lifecycle Semantics.
- `packages[].status` value MUST be one of `active`, `deprecated`,
  `archived`, or `yanked`.
- `packages[].estimateOverallCost.estimatedCost`, when present, MUST be a
  number in the range 1–10 inclusive.
- `packages[].quickstart`, when present, MUST reflect the current
  `packages/<id>/metadata.json` value.
- Package detail-only metadata (for example `customAttributes`) MUST NOT
  be copied into `packages/index.json`.
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
            "tags": ["productivity", "review", "automation"],
            "status": "active",
            "category": "automation",
            "estimateOverallCost": {
                "band": "mixed"
            },
            "quickstart": "https://github.com/agents-repo/my-package#quickstart"
        }
    ]
}
```
