# Package Format Specification (1.0.0)

This document defines the deterministic directory and file format
for packages stored in the registry.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Schema Version Lifecycle

This specification defines package layout and rules. It does not define
a JSON `schemaVersion` field.

| Version | Applies To | Status | Notes |
| --- | --- | --- | --- |
| `1.0.0` | spec document version | current | Initial entry |

Tooling and processes that validate package format SHOULD use the latest
supported spec document version in this table.

## Scope

A package is a named container that holds one or more agents and flows.

All package directories MUST exist under `packages/`.

## Contributor Workflow

Contributors and AI agents MUST follow this pipeline to produce a release:

1. Author or update source files under the package root
   (`metadata.json`, `agents/`, `flows/`). These are the only files
   contributors and AI agents are authorized to write directly.
2. Run `npm run package:validate -- --package <id>` to confirm the working state
   passes all preflight checks.
3. Run `npm run package:build -- --package <id>` to generate the version snapshot.
  This command builds both ZIP artifacts, computes SHA-256 checksums, writes
  `versions/<version>/`, updates `versions/manifest.json`, and updates
  `packages/index.json`.
4. Run `npm run package:validate-artifacts -- --package <id>` to validate
   generated artifacts for structural and security issues.

The scripts in this pipeline SHOULD remain single-responsibility and MUST NOT
implicitly invoke another pipeline step.

Contributors and AI agents MUST NOT manually create or modify any file under
`versions/`. The `package-build` script is the sole authorized writer for all
content under `versions/`.

## Naming Rules

- Package directory name MUST be lowercase kebab-case.
- Package directory name MUST match `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Package names MUST be unique within `packages/`.
- Agent IDs and flow IDs MUST follow the same naming rules.
- Agent IDs MUST be unique within `agents/`.
- Flow IDs MUST be unique within `flows/`.
- Agent IDs and flow IDs MUST be unique across both `agents/`
  and `flows/` within the same package to avoid collisions in
  the deployment artifact.

## Required Package Structure

```text
packages/
    <package-id>/
        metadata.json
        agents/
            <agent-id>.agent.md
            <agent-id>.metadata.json
        flows/
            <flow-id>.agent.md
            <flow-id>.metadata.json
        versions/
            <version>/
                metadata.json
                agents/
                    <agent-id>.agent.md
                    <agent-id>.metadata.json
                flows/
                    <flow-id>.agent.md
                    <flow-id>.metadata.json
                <version>.zip
                <version>-src.zip
            manifest.json
```

Package constraints:

- `metadata.json` MUST exist at the package root and MUST reflect
  the package's current working state. It MAY include unreleased
  changes prior to publication; the released copy for each version
  is preserved in `versions/<version>/metadata.json`.
- `versions/` MUST exist and contain at least one version folder.
- `versions/manifest.json` MUST exist.
- A package MUST contain at least one entry in `agents/` or `flows/`.
- `agents/` MAY be absent if the package contains no agents.
- `flows/` MAY be absent if the package contains no flows.

## Version Snapshot Rules

Each released version MUST have a corresponding snapshot folder at
`versions/<version>/`. A version snapshot folder:

- MUST be created exclusively by the `package-build` script. Contributors
  and AI agents MUST NOT manually create, modify, or remove any file inside
  `versions/<version>/` or `versions/manifest.json`.

- MUST contain `metadata.json` — a verbatim copy of the package
  `metadata.json` as it existed at release time.
- MUST contain `agents/` with the same contents as the package root
  `agents/` at release time, if the package contains agents.
- MUST contain `flows/` with the same contents as the package root
  `flows/` at release time, if the package contains flows.
- MUST contain `<version>.zip` — the deployment artifact.
- MUST contain `<version>-src.zip` — the source archive.
- MUST be treated as immutable once published. No file inside a
  released version folder MUST be modified or removed.

The package root `agents/`, `flows/`, and `metadata.json` represent
the current working state. They are not the authoritative historical
source for any specific version; version snapshot folders are.

For the package root working state:

- All root `.agent.md` files across `agents/` and `flows/` MUST share
  one identical frontmatter `version` value.
- The shared root frontmatter `version` MUST be greater than or equal
  to `versions/manifest.json` `latest` (semantic version precedence).
- At the package state that publishes `versions/<version>/`, the shared
  root frontmatter `version` MUST equal `<version>`, and
  `versions/manifest.json` `latest` MUST equal `<version>`.

## Agent Entry Rules

For every agent `<agent-id>`:

- `agents/<agent-id>.agent.md` MUST exist.
- `agents/<agent-id>.metadata.json` MUST exist.
- The `<agent-id>` stem MUST be identical for both files.

## Flow Entry Rules

For every flow `<flow-id>`:

- `flows/<flow-id>.agent.md` MUST exist.
- `flows/<flow-id>.metadata.json` MUST exist.
- The `<flow-id>` stem MUST be identical for both files.

## Artifact Rules

Each released version MUST produce two ZIP artifacts stored inside
its version snapshot folder at `versions/<version>/`.

### Deployment Artifact (`<version>.zip`)

- `<version>.zip` is the deployment artifact intended to be
  extracted into a project's `.github/` folder.
- A deployment ZIP MUST contain a single `agents/` directory.
- The `agents/` directory MUST include the `.agent.md` file for
  every agent and every flow present in the package at that version.
- Agent files are placed as `agents/<agent-id>.agent.md`.
- Flow files are also placed as `agents/<flow-id>.agent.md`
  because Copilot reads flows as agent instructions.
- Within `<version>.zip`, every bundled `agents/*.agent.md`
  frontmatter `version` MUST equal `<version>`.
- `.metadata.json` sidecars MUST NOT be included in the
  deployment ZIP.
- `metadata.json` MUST NOT be included in the deployment ZIP.

### Source Archive (`<version>-src.zip`)

- `<version>-src.zip` is the source archive for that version.
- A source archive MUST contain the full package source at release
  time, consisting of all files and directories present in the
  package root at release time except `versions/`.
- This includes `metadata.json`, `agents/` (with all `.agent.md`
  and `.metadata.json` files), `flows/` (if present), and any
  other top-level package files present at release time.
- The `versions/` folder MUST NOT be included in the source archive.
- `.metadata.json` sidecars MUST be included in the source archive.
- `metadata.json` MUST be included in the source archive.

### General Artifact Rules

- Deployment ZIP file names MUST follow `<semver>.zip`
  with no `v` prefix.
- Source archive file names MUST follow `<semver>-src.zip`
  with no `v` prefix.
- `versions/manifest.json` MUST list both artifacts for every
  released version.

## Registry Index

- `packages/index.json` MUST exist at the root of the `packages/`
  directory.
- `packages/index.json` MUST be kept current and reflect all packages
  present under `packages/`.
- The format and validation rules for `packages/index.json` are defined
  in `specs/index-schema.md`.
- When a package is added, updated, or a new version is published,
  `packages/index.json` MUST be updated accordingly.
- For package metadata, index entries MUST
  project package `status`, `category`, and `estimateOverallCost.band`.
- For package metadata, index entries MAY
  project `estimateOverallCost.estimatedCost` and `quickstart`.
- Package detail-only fields (for example `customAttributes`) MUST NOT
  be projected into `packages/index.json`.

## Determinism Rules

- Paths in documentation and manifests MUST use forward slashes.
- File names are case-sensitive and MUST match this specification
  exactly.
- Unknown top-level files SHOULD be avoided in package roots.

## Minimal Example

```text
packages/my-package/
    metadata.json
    agents/
        my-agent.agent.md
        my-agent.metadata.json
    versions/
        1.0.0/
            metadata.json
            agents/
                my-agent.agent.md
                my-agent.metadata.json
            1.0.0.zip
            1.0.0-src.zip
        manifest.json
```

## Full Example

```text
packages/my-package/
    metadata.json
    agents/
        planner.agent.md
        planner.metadata.json
        executor.agent.md
        executor.metadata.json
    flows/
        triage.agent.md
        triage.metadata.json
    versions/
        1.0.0/
            metadata.json
            agents/
                planner.agent.md
                planner.metadata.json
                executor.agent.md
                executor.metadata.json
            flows/
                triage.agent.md
                triage.metadata.json
            1.0.0.zip
            1.0.0-src.zip
        1.1.0/
            metadata.json
            agents/
                planner.agent.md
                planner.metadata.json
                executor.agent.md
                executor.metadata.json
            flows/
                triage.agent.md
                triage.metadata.json
            1.1.0.zip
            1.1.0-src.zip
        manifest.json
```
