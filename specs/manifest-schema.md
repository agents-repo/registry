# Manifest Schema Specification (v0.1)

This document defines the deterministic `manifest.json`
format for package releases.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Schema Version Lifecycle

`schemaVersion` identifies the manifest **format** version, not the package
release version and not the spec document version (`v0.1`).

| `schemaVersion` | Defined by spec document | Notes |
| --- | --- | --- |
| `1.0.0` | This document (v0.1) | Initial manifest format |

Tooling MUST reject manifests whose `schemaVersion` is not in the table above
unless it explicitly supports a newer schema version.

## File Location

- Manifest MUST be stored at `versions/manifest.json` inside
  the package directory.
- Manifest MUST be valid UTF-8 encoded JSON.

## Top-Level Schema

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `schemaVersion` | string | yes | MUST be `1.0.0`; see [Schema Version Lifecycle](#schema-version-lifecycle) |
| `name` | string | yes | MUST match `metadata.json.name` |
| `latest` | string | yes | MUST be valid semantic version |
| `versions` | array | yes | MUST contain one or more entries |

## Version Entry Schema

Each entry in `versions` MUST be an object with:

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `version` | string | yes | Semantic version (`MAJOR.MINOR.PATCH`) |
| `artifact` | string | yes | ZIP filename relative to `versions/` |
| `sha256` | string | yes | Lowercase hex, exactly 64 characters |
| `createdAt` | string | yes | RFC 3339 timestamp |

## Validation Rules

- `latest` MUST equal the maximum semantic version present in `versions[]`.
- `versions[].version` values MUST be unique.
- `versions[].artifact` MUST match `^[0-9]+\.[0-9]+\.[0-9]+\.zip$`.
- `versions[].artifact` MUST equal `<version>.zip` where `<version>` is the
  value of `versions[].version` in the same entry.
- The file named by `versions[].artifact` MUST exist in `versions/`.
- ZIP artifacts are deployment artifacts per `package-format.md`
  (all agent and flow `.agent.md` files placed under `agents/` in the ZIP).
- `versions` SHOULD be sorted in ascending semantic version order.

## Canonical JSON Example

```json
{
    "schemaVersion": "1.0.0",
    "name": "my-package",
    "latest": "1.1.0",
    "versions": [
        {
            "version": "1.0.0",
            "artifact": "1.0.0.zip",
            "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "createdAt": "2026-05-02T00:00:00Z"
        },
        {
            "version": "1.1.0",
            "artifact": "1.1.0.zip",
            "sha256": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            "createdAt": "2026-05-02T01:00:00Z"
        }
    ]
}
```
