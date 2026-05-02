# Versioning Rules Specification (v0.1)

This document defines semantic versioning and compatibility rules
for registry packages and registry specifications.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Package Versioning

- Package versions MUST use semantic versioning: `MAJOR.MINOR.PATCH`.
- Pre-release and build metadata MUST NOT be used.
- Each released version MUST have exactly one ZIP artifact at `versions/<version>.zip`.

## Manifest and Metadata Consistency

- `manifest.json.latest` MUST reference an existing entry in `manifest.json.versions`.
- `manifest.json.versions[].version` MUST be unique.
- `manifest.json.versions[].sha256` MUST match artifact bytes exactly.

## Compatibility Policy

- PATCH increments MUST be backward-compatible bug fixes and clarifications.
- MINOR increments SHOULD be backward-compatible feature additions.
- MAJOR increments MAY include breaking changes.

## Immutability Rules

- Published ZIP artifacts for a specific version MUST be immutable.
- `sha256` for a published version MUST NOT change.
- If artifact content changes, a new version MUST be published.

## Deprecation Rules

- Deprecated versions SHOULD remain available for reproducibility.
- Deprecation status SHOULD be described in
  release notes or package documentation.
- Removal of a published version SHOULD be avoided
  except for legal or security reasons.

## Specification Versioning

- Spec files in `specs/` MUST include explicit version markers in titles.
- Breaking schema or format changes to specs SHOULD increment spec major version.
- Tooling SHOULD validate against declared spec versions.

## Examples

Valid progression:

- `1.0.0 -> 1.0.1` for a bug fix.
- `1.0.1 -> 1.1.0` for backward-compatible features.
- `1.1.0 -> 2.0.0` for a breaking format change.
