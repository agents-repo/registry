# Package Format Specification (v0.1)

This document defines the deterministic directory and file format
for packages stored in the registry.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Scope

A package is a named container that holds one or more agents and flows.

All package directories MUST exist under `packages/`.

## Naming Rules

- Package directory name MUST be lowercase kebab-case.
- Package directory name MUST match `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Package names MUST be unique within `packages/`.
- Agent IDs and flow IDs MUST follow the same naming rules.
- Agent IDs MUST be unique within `agents/`.
- Flow IDs MUST be unique within `flows/`.

## Required Package Structure

```text
packages/
    <package-id>/
        metadata.json
        agents/
            <agent-id>.md
            <agent-id>.metadata.json
        flows/
            <flow-id>.md
            <flow-id>.metadata.json
        versions/
            <version>.zip
            manifest.json
```

Package constraints:

- `metadata.json` MUST exist at the package root.
- `versions/` MUST exist and contain at least one ZIP artifact.
- `versions/manifest.json` MUST exist.
- A package MUST contain at least one entry in `agents/` or `flows/`.
- `agents/` MAY be absent if the package contains no agents.
- `flows/` MAY be absent if the package contains no flows.

## Agent Entry Rules

For every agent `<agent-id>`:

- `agents/<agent-id>.md` MUST exist.
- `agents/<agent-id>.metadata.json` MUST exist.
- The stem `<agent-id>` MUST be identical for both files.

## Flow Entry Rules

For every flow `<flow-id>`:

- `flows/<flow-id>.md` MUST exist.
- `flows/<flow-id>.metadata.json` MUST exist.
- The stem `<flow-id>` MUST be identical for both files.

## Artifact Rules

- Each `<version>.zip` in `versions/` is a deployment artifact
  intended to be extracted into a project's `.github/` folder.
- A ZIP MUST contain only the `.md` files from `agents/` and `flows/`
  present at that version, preserving the `agents/` and `flows/`
  directory structure.
- `.metadata.json` sidecars MUST NOT be included in ZIP artifacts.
- `metadata.json` at the package root MUST NOT be included in
  ZIP artifacts.
- ZIP file names MUST follow `<semver>.zip` with no `v` prefix.
- `versions/manifest.json` MUST list all released ZIP artifacts.
- Additional artifact variants (e.g. full source archives) are
  reserved for future spec versions.

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
        my-agent.md
        my-agent.metadata.json
    versions/
        1.0.0.zip
        manifest.json
```

## Full Example

```text
packages/my-package/
    metadata.json
    agents/
        planner.md
        planner.metadata.json
        executor.md
        executor.metadata.json
    flows/
        triage.md
        triage.metadata.json
    versions/
        1.0.0.zip
        1.1.0.zip
        manifest.json
```
