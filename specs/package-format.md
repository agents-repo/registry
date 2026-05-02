# Package Format Specification (v0.1)

This document defines the deterministic directory and file format
for packages stored in the registry.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Scope

This specification applies to two package types:

- Agent packages
- Flow packages

All package directories MUST exist under `packages/`.

## Naming Rules

- Package directory name MUST be lowercase kebab-case.
- Package directory name MUST match `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Package names MUST be unique within `packages/`.

## Required Agent Package Structure

```text
packages/
    <agent-name>/
        agent.md
        metadata.json
        manifest.json
        versions/
            <version>.zip
```

Agent package constraints:

- `agent.md` MUST exist.
- `metadata.json` MUST exist.
- `manifest.json` MUST exist.
- `versions/` MUST exist.
- Each file in `versions/` MUST be named `<semver>.zip`.

## Required Flow Package Structure

```text
packages/
    <flow-name>/
        flow.md
        metadata.json
        manifest.json
        versions/
            <version>.zip
```

Flow package constraints:

- `flow.md` MUST exist.
- `metadata.json` MUST exist.
- `manifest.json` MUST exist.
- `versions/` MUST exist.
- Each file in `versions/` MUST be named `<semver>.zip`.

## Artifact Rules

- A ZIP artifact referenced by `manifest.json` MUST exist in `versions/`.
- ZIP artifacts MUST contain only source content for the package type.
- For agent packages, each ZIP MUST contain only `agent.md` and `metadata.json`.

- For flow packages, each ZIP MUST contain only `flow.md` and `metadata.json`.

## Determinism Rules

- Paths in documentation and manifests MUST use forward slashes.
- File names are case-sensitive and MUST match this specification exactly.
- Unknown top-level files SHOULD be avoided in package roots.

## Minimal Agent Example

```text
packages/my-agent/
    agent.md
    metadata.json
    manifest.json
    versions/
        1.0.0.zip
```

## Minimal Flow Example

```text
packages/my-flow/
    flow.md
    metadata.json
    manifest.json
    versions/
        1.0.0.zip
```
