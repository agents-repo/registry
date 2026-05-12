# Versioning Rules Specification (1.0.0)

This document defines semantic versioning and compatibility rules
for registry packages and registry specifications.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Schema Version Lifecycle

This specification defines versioning and compatibility rules. It does not
define a JSON `schemaVersion` field.

| Version | Applies To | Status | Notes |
| --- | --- | --- | --- |
| `1.0.0` | spec document version | current | Initial entry |

Tooling and processes that enforce versioning behavior SHOULD use the latest
supported spec document version in this table.

## Schema Lifecycle Policy

- `schemaVersion` values are metadata/manifest/index format versions and are
  independent from package release versions.
- Tooling MUST resolve supported schema versions from
  `specs/schema-versions.json`.
- New packages SHOULD use the `current` schema version for each schema family.
- Existing packages MAY continue using older schema versions when they remain
  in the `supported` set.
- Tooling SHOULD emit warnings for schema versions marked `deprecated`.
- Tooling MUST reject schema versions marked `eol`.

## Package Versioning

- Package versions MUST use semantic versioning: `MAJOR.MINOR.PATCH`.
- Pre-release and build metadata MUST NOT be used.
- Each released version MUST have a snapshot folder at
  `versions/<version>/` containing the deployment artifact
  (`<version>.zip`), the source archive (`<version>-src.zip`),
  a `metadata.json` snapshot, and source tree snapshots
  (`agents/` and `flows/` if present).

## Script-Gated Publication

- `versions/` content (snapshot folders and `manifest.json`) MUST be
  produced exclusively by the `package-build` script.
- Contributors and AI agents MUST NOT manually create or modify any file
  under `versions/`.
- The mandatory release pipeline is:
  `package:validate` → `package:build` → `package:validate-artifacts`.
- Pipeline orchestration MUST be explicit (for example CI jobs or AI agents);
  scripts MUST NOT implicitly invoke other pipeline steps.

## Version Overwrite Policy

- By default, the `package-build` script MUST NOT overwrite an existing
  `versions/<version>/` snapshot. Attempting to do so without the
  `--force-rebuild` flag MUST produce an `ERR_VERSION_EXISTS` error.
- The `--force-rebuild` flag allows overwriting an existing snapshot
  ONLY on non-protected branches. On protected branches the flag MUST be
  rejected with `ERR_OVERWRITE_PROTECTED_BRANCH`.
- Protected branches are: `main`, `master`, and any branch matching
  `release/*`.
- When `--force-rebuild` succeeds, the existing snapshot is atomically
  replaced; `manifest.json` and `packages/index.json` are updated
  accordingly.

## Manifest and Metadata Consistency

- `manifest.json.latest` MUST equal the maximum semantic version in
  `manifest.json.versions[]`.
- `manifest.json.versions[].version` MUST be unique.
- `manifest.json.versions[].artifact` MUST equal `<version>.zip` where
  `<version>` matches the entry's own `version` field.
- `manifest.json.versions[].sha256` MUST match the deployment artifact
  bytes exactly.
- `manifest.json.versions[].srcArtifact` MUST equal `<version>-src.zip`
  where `<version>` matches the entry's own `version` field.
- `manifest.json.versions[].srcSha256` MUST match the source archive
  bytes exactly.
- Every `.agent.md` file inside `versions/<version>/<version>.zip`
  MUST have frontmatter `version` equal to `<version>`.
- Every `.agent.md` file inside `versions/<version>/<version>-src.zip`
  MUST have frontmatter `version` equal to `<version>`.
- Every `.agent.md` file inside `versions/<version>/agents/`
  MUST have frontmatter `version` equal to `<version>`.
- Every `.agent.md` file inside `versions/<version>/flows/`, if present,
  MUST have frontmatter `version` equal to `<version>`.

## Root Working-Copy Version Consistency

- All root `.agent.md` files across `agents/` and `flows/` within a
  package MUST share one identical frontmatter `version` value.
- The shared root frontmatter `version` MUST be greater than or equal
  to `manifest.json.latest` (semantic version precedence).
- At the package state that publishes `versions/<version>/`, the shared
  root frontmatter `version` MUST equal `<version>`, and
  `manifest.json.latest` MUST equal `<version>`.

## Registry Index Update Rules

- When a new version is published (`versions/<version>/` is created and
  `manifest.json.latest` is updated), the corresponding entry in
  `packages/index.json` MUST be updated to reflect the new `latest`
  value and any changed summary fields.
- `packages/index.json` `updatedAt` MUST be updated whenever an entry
  changes.
- See `specs/index-schema.md` for the full index schema and validation
  rules.

## Compatibility Policy

- PATCH increments MUST be backward-compatible bug fixes and clarifications.
- MINOR increments SHOULD be backward-compatible feature additions.
- MAJOR increments MAY include breaking changes.

## Immutability Rules

- Published ZIP artifacts for a specific version MUST be immutable.
- Published source archives for a specific version MUST be immutable.
- Published version snapshot folders (`versions/<version>/`) MUST be
  immutable. No file inside a released version folder MUST be modified
  or removed after publication.
- `sha256` and `srcSha256` for a published version MUST NOT change.
- If artifact content changes, a new version MUST be published.

## Deprecation Rules

- Deprecated versions SHOULD remain available for reproducibility.
- Deprecation status SHOULD be described in
  release notes or package documentation.
- Removal of a published version SHOULD be avoided
  except for legal or security reasons.

## Specification Versioning

- Spec files in `specs/` MUST include explicit version markers in titles
  using the exact syntax `(<MAJOR>.<MINOR>.<PATCH>)`.
- Breaking schema or format changes to specs SHOULD increment `MAJOR`
  and reset `MINOR` and `PATCH` to `0`.
- Backward-compatible additions to specs SHOULD increment `MINOR` and
  reset `PATCH` to `0`.
- Backward-compatible clarifications or bug fixes to specs SHOULD
  increment `PATCH`.
- Tooling SHOULD validate against declared spec versions.

## Examples

Valid progression:

- `1.0.0 -> 1.0.1` for a bug fix.
- `1.0.1 -> 1.1.0` for backward-compatible features.
- `1.1.0 -> 2.0.0` for a breaking format change.
