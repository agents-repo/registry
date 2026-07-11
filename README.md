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

Every PR targeting `main` MUST include a tracking reference in
`## Related Issues`: `Closes #<issue-number>` for standard tasks, or the
security-advisory format defined in the **Workflow exceptions** section of
`.github/CONTRIBUTING.md` when no public tracking issue exists. See
[Required Workflow](.github/CONTRIBUTING.md#required-workflow) for the
canonical policy (issue → branch → push → draft PR before implementation).

## IDE Setup

This repository commits IDE deployment mirrors so contributors get agent
instructions on clone without manual install steps.

| IDE | Agents / skills | Project guidelines |
| --- | --- | --- |
| GitHub Copilot | `.github/agents/*.agent.md` | `.github/copilot-instructions.md` |
| Cursor | `.cursor/skills/<id>/SKILL.md` | `.cursor/rules/agents-registry.mdc` |

Canonical sources for repo workflow agents:

- `packages/agents-repo/agents-repo-package-creation/agents/` and `flows/`
- `.github/copilot-instructions.md` (for Cursor rules)

Regenerate mirrors after editing canonical sources:

```bash
npm run package:sync-ide-targets -- \
  --package agents-repo/agents-repo-package-creation \
  --target all
```

When only `copilot-instructions.md` changes:

```bash
npm run sync:cursor-rules
```

Do not edit `.github/agents/`, `.cursor/skills/`, or `.cursor/rules/` directly.
See `.github/CONTRIBUTING.md` for the full edit workflow.

## Release Workflow

- Release versions follow Semantic Versioning `MAJOR.MINOR.PATCH` sourced from
    <https://semver.org>.
- `PATCH` is the canonical term for backward-compatible bugfix releases.
- Pushes to `main` (post-merge integration via pull request, not direct push)
    run the release validation checks and then execute `semantic-release`.
- A release is published only when commit history includes releasable changes
    per the commit-to-version mapping below.
- `workflow_dispatch` remains available for operational checks.
- `dry_run` defaults to `true`; set `dry_run=false` only when intentionally
    running a manual publish from `main`.
- Git tags use `v<MAJOR>.<MINOR>.<PATCH>` format.

The semantic version value remains `<MAJOR>.<MINOR>.<PATCH>`. The leading
`v` is only the Git tag naming convention used for release tags.

### Commit-To-Version Mapping

The release workflow uses Conventional Commit semantics. Custom release
rules in `.releaserc.json` map all `feat(package)` and `fix(package)`
commits—including `!` and `BREAKING CHANGE:` footers—to `PATCH`. Platform
breaking changes use commit-analyzer built-in default rules when no custom
rule matches:

- `type!:` or `BREAKING CHANGE:` (without `package` scope) => `MAJOR`
- `feat(package):` and `feat(package)!:` => `PATCH`
  (catalog addition or new package version)
- `fix(package):` and `fix(package)!:` => `PATCH` (package correction)
- `feat:` with any other or no scope => `MINOR` (platform or tooling changes)
- `fix:`, `perf:`, and `revert:` with any scope except `package` => `PATCH`

### Registry distribution tags vs package versions

Registry Git tags (for example `v2.0.1`) version the **catalog snapshot**
consumed via refs like `v2.x`. Package `versions/manifest.json` `latest` values
version individual package compatibility. These layers are independent.

All package squash-merge titles publish a registry **PATCH** so `v2.x` consumers
receive catalog updates. Express breaking package compatibility in the package's
own semver (for example `1.0.0` → `2.0.0`). Registry **MAJOR** is reserved for
platform, tooling, or spec breaking commits without the `package` scope.

Commit types not listed above do not trigger an automated release.

Examples:

- `feat!: remove legacy manifest field` => major bump
- `feat: add release dashboard metadata` => minor bump
- `feat(release): add scoped rules` => minor bump
- `feat(package): add agents-repo/hello-agent` => patch bump
- `feat(package)!: publish agents-repo/hello-agent 2.0.0` => patch bump
- `fix(package): correct hello-agent metadata` => patch bump
- `fix: adjust lint config` => patch bump

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

For a minimal working example package, start with
`packages/agents-repo/hello-agent/README.md`.

See [NAMESPACE_RULES.md](./NAMESPACE_RULES.md) and [MIGRATION.md](./MIGRATION.md)
for namespaced package layout.

Current testing baseline focuses on `tests/unit/`.
For full test layout conventions, path mirroring, and scope guidance, see
`tests/README.md`.

## Package Development Workflow

Contributors and AI agents work only on source files under the package root.
The scripts manage all versioned artifacts.

### Required pipeline

```bash
# 1. Build and publish a version snapshot
npm run package:build -- --package <namespace>/<package-id>

# 2. Deep artifact verification
npm run package:validate-artifacts -- --package <namespace>/<package-id>
```

The `package-build` script automatically runs preflight validation equivalent
to `package:validate` before building artifacts. Scripts are intentionally
single-responsibility, and orchestration is still performed externally
(for example by CI or AI agents).

During development, you MAY run `npm run package:validate -- --package <namespace>/<package-id>`
manually to check the working state before the package is ready to build.

For package-script changes, use the separate smoke command:

```bash
npm run package:create:smoke -- --package <namespace>/<package-id>
# example: agents-repo/smoke-package
```

That smoke flow creates a temporary package workspace under
`packages/agents-repo/<package-id>/` and runs the full script chain end to end:
`package:create`, `package:validate`, `package:build`, and
`package:validate-artifacts`.

### PR and Copilot checks

- PR baseline checks run markdown linting, Sonar linting, unit tests,
  typecheck, and the repo-wide package ZIP scan with pinned runtime.
- Package PR checks run blocking markdown and Sonar linting plus package
  validate for changed package directories.
- Package build and artifact validation are run locally before committing
  version snapshots.
- Package script changes also run the dedicated smoke workflow, which calls
  `npm run package:create:smoke -- --package agents-repo/smoke-package`.
- Copilot preflight can be invoked via `.github/workflows/copilot-environment.yml`.

Package artifacts are designed for reuse in external projects, and downstream
repositories with different linting rules need to adapt imported agent files
or configure ignore rules on their side.

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
<namespace>/
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
    webapp consumption, including package owner.
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
