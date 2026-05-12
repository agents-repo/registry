# Copilot Agents Registry

The open-source source of truth for GitHub Copilot agents and multi-agent flows.

## Project Scope

This repository defines deterministic, AI-readable specifications
and stores registry packages.

Registry responsibilities:

- Store agent and flow packages under `packages/`.
- Store package metadata and manifests.
- Store versioned deployment ZIPs and source archives for releases.
- Maintain AI-readable specifications in `specs/`.
- Provide examples and placeholder validation/build scripts.

This repository is intentionally data-first and specification-first.
Runtime logic is out of scope for this initial baseline.

## Repository Structure

```text
registry/
    packages/
        .keep
        index.json
    specs/
        package-format.md
        metadata-schema.md
        manifest-schema.md
        agent-format.md
        flow-format.md
        versioning-rules.md
        index-schema.md
    examples/
        sample-agent/
            README.md
        sample-flow/
            README.md
    scripts/
        lib/
            errors.ts
            frontmatter.ts
            git.ts
            types.ts
            validate-package.ts
        build.ts
        validate.ts
        package-validate.ts
        package-build.ts
        package-validate-artifacts.ts
    tsconfig.json
    README.md
    LICENSE
```

## Package Development Workflow

Contributors and AI agents work only on source files under the package root.
The scripts manage all versioned artifacts.

### Required pipeline

```bash
# 1. Validate working-state source files
npm run package:validate -- --package <id>

# 2. Build and publish a version snapshot
npm run package:build -- --package <id>

# 3. Deep artifact verification
npm run package:validate-artifacts -- --package <id>
```

Scripts are intentionally single-responsibility. They do not chain each other;
orchestration is performed externally (for example by CI or AI agents).

### Overwrite protection

- Overwriting an existing `versions/<version>/` requires `--force-rebuild`.
- `--force-rebuild` is **not allowed** on protected branches: `main`, `master`,
  `release/*`.
- On a protected branch with a pre-existing version, the build hard-fails with
  `ERR_OVERWRITE_PROTECTED_BRANCH`. Publish a new semver instead.

### No manual edits under `versions/`

All content under `versions/` is generated exclusively by `package-build`.
Contributors and AI agents MUST NOT manually create, modify, or remove any file
under `versions/`. See `specs/package-format.md` and `specs/versioning-rules.md`.

## Package Baseline

Package format:

Package format:

```text
<package-id>/
    metadata.json
    agents/
        <agent-id>.agent.md
        <agent-id>.metadata.json
    flows/
        <flow-id>.agent.md
        <flow-id>.metadata.json
    versions/
        manifest.json
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
```

Registry index:

- `packages/index.json` lists all packages with summary fields for
  webapp consumption.
- See `specs/index-schema.md` for the schema.

Package rules:

- A package must have at least one agent or flow.
- `agents/` or `flows/` may be absent if unused.
- `versions/manifest.json` tracks all releases.
- Each published release lives in `versions/<version>/`.
- Published version snapshot folders are write-once and immutable;
    files in `versions/<version>/` must not be modified or removed
    after publication.
- `versions/<version>/metadata.json` preserves the historical package metadata
    for that release.
- `versions/<version>/agents/` and `versions/<version>/flows/` preserve the
    historical source tree for that release.
- Each release includes `<version>.zip` and `<version>-src.zip`.
- Use semantic versioning with no `v` prefix.
- Use SHA-256 checksums.
- `metadata.json` and all `.metadata.json` sidecars must include a
    `schemaVersion` supported by `specs/schema-versions.json`.
- Deprecated schema versions produce warnings; end-of-life schema versions
    are rejected by validation tooling.
- The package root `metadata.json`, `agents/`, and `flows/` describe the
    current working state.
- All root `.agent.md` files in `agents/` and `flows/` must share the
    same frontmatter `version` within a package.
- During development, that shared root frontmatter version may be equal
    to or ahead of `versions/manifest.json` `latest`; at release
    publication, it must match `latest`.
- Agent IDs and flow IDs must be unique across a package; do not reuse the
    same ID in both `agents/` and `flows/`.
- ZIP bundles merge all `agents/*.agent.md` and `flows/*.agent.md`
  into a single `agents/` folder for extraction into `.github/`.

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
- `specs/index-schema.md`
- `specs/schema-versions.json`

## Related Repositories

This project is part of a two-repository setup:

- `registry`: core source of truth (this repository)
- `webapp`: frontend that reads data from the registry

## License

This repository is licensed under MIT.
