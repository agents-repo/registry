# Copilot Agents Registry

The open-source source of truth for GitHub Copilot agents and multi-agent flows.

## Project Scope

This repository defines deterministic, AI-readable specifications
and stores registry packages.

Registry responsibilities:

- Store agent and flow packages under `packages/`.
- Store package metadata and manifests.
- Store versioned ZIP bundles for releases.
- Maintain AI-readable specifications in `specs/`.
- Provide examples and placeholder validation/build scripts.

This repository is intentionally data-first and specification-first.
Runtime logic is out of scope for this initial baseline.

## Repository Structure

```text
registry/
    packages/
        .keep
    specs/
        package-format.md
        metadata-schema.md
        manifest-schema.md
        agent-format.md
        flow-format.md
        versioning-rules.md
    examples/
        sample-agent/
            README.md
        sample-flow/
            README.md
    scripts/
        build.js
        validate.js
    README.md
    LICENSE
```

## Package Baseline

Agent package format:

```text
<agent-name>/
    agent.md
    metadata.json
    manifest.json
    versions/
        <version>.zip
```

Manifest rules:

- Use semantic versioning.
- Use SHA-256 checksums.
- ZIP bundles contain only `agent.md` and `metadata.json`.

## Specifications

All normative specifications are stored in `specs/`
and written to be deterministic for AI and tool consumption.

Primary spec documents:

- `specs/package-format.md`
- `specs/metadata-schema.md`
- `specs/manifest-schema.md`
- `specs/agent-format.md`
- `specs/flow-format.md`
- `specs/versioning-rules.md`

## Related Repositories

This project is part of a two-repository setup:

- `registry`: core source of truth (this repository)
- `webapp`: frontend that reads data from the registry

## License

This repository is licensed under MIT.
Example content may optionally use CC0 in the future,
but CC0 is not required.
