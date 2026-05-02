# Manifest Schema Specification (v0.1)

This document defines the deterministic `manifest.json`
format for package releases.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## File Location

- Manifest MUST be stored at package root as `manifest.json`.
- Manifest MUST be valid UTF-8 encoded JSON.

## Top-Level Schema

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `schemaVersion` | string | yes | MUST be `1.0.0` for v0.1 |
| `name` | string | yes | MUST match `metadata.json.name` |
| `type` | string | yes | MUST match `metadata.json.type` |
| `latest` | string | yes | MUST be valid semantic version |
| `versions` | array | yes | MUST contain one or more entries |

## Version Entry Schema

Each entry in `versions` MUST be an object with:

| Field | Type | Required | Constraints |
| --- | --- | --- | --- |
| `version` | string | yes | Semantic version (`MAJOR.MINOR.PATCH`) |
| `artifact` | string | yes | Relative path to ZIP in `versions/` |
| `sha256` | string | yes | Lowercase hex, exactly 64 characters |
| `createdAt` | string | yes | RFC 3339 timestamp |

## Validation Rules

- `latest` MUST match one `versions[].version` value.
- `versions[].version` values MUST be unique.
- `versions[].artifact` MUST match `^versions/[0-9]+\.[0-9]+\.[0-9]+\.zip$`.
- `versions[].artifact` file MUST exist in package directory.
- Agent ZIP artifacts MUST contain only `agent.md` and `metadata.json`.
- Flow ZIP artifacts MUST contain only `flow.md` and `metadata.json`.
- `versions` SHOULD be sorted in ascending semantic version order.

## Canonical JSON Example

```json
{
    "schemaVersion": "1.0.0",
    "name": "my-agent",
    "type": "agent",
    "latest": "1.0.0",
    "versions": [
        {
            "version": "1.0.0",
            "artifact": "versions/1.0.0.zip",
            "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "createdAt": "2026-05-02T00:00:00Z"
        }
    ]
}
```
