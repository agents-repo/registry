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
- Provide examples and package-scoped build and validation scripts.

This repository is intentionally data-first and specification-first.
Runtime logic is out of scope for this initial baseline.

## Development Environment

Use the pinned runtime to keep local development, Copilot tasks, and CI aligned.

### Runtime pins

- Node.js: `24.15.0` (see `.nvmrc` and `.node-version`)
- npm: `11.12.1` (see `packageManager` in `package.json`)

### GitHub CLI

This repository prefers GitHub communication through `gh` CLI for issue and
pull request operations.

Verify availability and authentication:

```bash
gh --version
gh auth status
```

If `gh auth status` reports no login, run `gh auth login`.

### Setup

```bash
nvm use
corepack enable
corepack prepare npm@11.12.1 --activate
npm ci
npm run env:check
```

If you do not use `nvm`, install Node `24.15.0` manually and then run the
same Corepack and npm commands.

Common `gh` commands used in this workflow:

```bash
# inspect issue scope
gh issue view <number> --repo agents-repo/registry

# open a draft PR with template-aligned body content
gh pr create --repo agents-repo/registry \
  --draft --title "..." \
  --body-file <file>
```

## VS Code Workspace Settings

Shared workspace editor defaults are managed in `.vscode/settings.json`.
Policy for shared versus personal settings is documented in
`.vscode/README.md`.

These defaults are designed to remain stable across Linux, macOS, and Windows,
while lint and formatting rules stay defined by repository tooling.

The shared workspace indentation default is 2 spaces, and JSON/JSONC
indentation is enforced by `npm run lint:sonar` for repo files outside
`packages/**/versions/**`.

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
            ... (modular helpers, validators, and build/create utilities)
        package-validate.ts
        package-build.ts
        package-create.ts
        package-validate-artifacts.ts
    tests/
        unit/
            ... (mirrors scripts/lib structure for unit tests)
        integration/
            ... (multi-module integration scenarios)
        e2e/
            ... (workflow-level end-to-end checks)
        fixtures/
            ... (shared test inputs and snapshots)
        helpers/
            ... (shared test utilities)
    tsconfig.json
    README.md
    LICENSE
```

Current testing baseline focuses on `tests/unit/`.
For full test layout conventions, path mirroring, and scope guidance, see
`tests/README.md`.

## Package Development Workflow

Contributors and AI agents work only on source files under the package root.
The scripts manage all versioned artifacts.

### Required pipeline

```bash
# 1. Build and publish a version snapshot
npm run package:build -- --package <id>

# 2. Deep artifact verification
npm run package:validate-artifacts -- --package <id>
```

The `package-build` script automatically runs preflight validation equivalent
to `package:validate` before building artifacts. Scripts are intentionally
single-responsibility, and orchestration is still performed externally
(for example by CI or AI agents).

During development, you MAY run `npm run package:validate -- --package <id>`
manually to check the working state before the package is ready to build.

### PR and Copilot checks

- PR baseline checks run markdown linting, Sonar linting, unit tests,
  typecheck, and the repo-wide package ZIP scan with pinned runtime.
- Package PR checks run package validate/build/validate-artifacts for changed
  package directories.
- Copilot preflight can be invoked via `.github/workflows/copilot-environment.yml`.

### Overwrite protection

  `release/*`.
  `ERR_OVERWRITE_PROTECTED_BRANCH`. Publish a new semver instead.

#### CI Branch Detection

In CI environments (GitHub Actions), the `package-build` script detects the
target branch using `git rev-parse --abbrev-ref HEAD` first, then falls back
to GitHub Actions environment variables (`GITHUB_BASE_REF`, `GITHUB_REF_NAME`)
if git returns `HEAD` (detached state). This ensures the protected-branch guard
works correctly in pull requests and tag builds, where the repository is
checked out in detached HEAD state. See `specs/versioning-rules.md` for details.

### No manual edits under `versions/`

All content under `versions/` is generated exclusively by `package-build`.
Contributors and AI agents MUST NOT manually create, modify, or remove any file
under `versions/`. See `specs/package-format.md` and `specs/versioning-rules.md`.

## Package Baseline

Package format:

```text
<package-id>/
    metadata.json
    README.md (optional)
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
- Package root `README.md` may be used for package-level documentation;
    when metadata `quickstart` is provided, it should point to this README.
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
