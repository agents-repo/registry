# Contributing

Thanks for contributing to the Agents Registry.

## Project Focus

This repository is a registry and specification source of truth.
Most contributions are documentation, schema, and package-structure changes.

## Docs and repository pages

For user guides and cross-repo documentation, see
[agents-repo.org/docs/](https://agents-repo.org/docs/).
For this repository's overview on the public site, see
[agents-repo.org/repositories/registry/](https://agents-repo.org/repositories/registry/).

When you change a user-facing or contributor workflow in this
repository, update the corresponding page(s) in
[agents-repo/webapp](https://github.com/agents-repo/webapp) under
`src/content/docs/` in the same PR or an immediate follow-up.

## Before You Start

1. Open an issue using the appropriate issue form.
2. Confirm scope and acceptance criteria.
3. Align on whether the change is breaking or non-breaking.

Issue form selection MUST match the task type. Contributors MUST use the
matching form in `.github/ISSUE_TEMPLATE/` when tooling can apply it directly;
otherwise, they MUST manually include the intended template's sections in the
issue body.

Documentation-only work that does **not** change files under `specs/` uses the
task/chore issue category and the `docs/` branch prefix. Normative changes to
`specs/` use the spec-change form and `spec/` branch prefix.

Issue form selection MUST match one of these categories:

| Category | Issue form |
| --- | --- |
| Bug or inconsistency | `.github/ISSUE_TEMPLATE/bug-inconsistency.yml` |
| Spec change | `.github/ISSUE_TEMPLATE/spec-change.yml` |
| Feature proposal | `.github/ISSUE_TEMPLATE/feature-proposal.yml` |
| Task or chore | `.github/ISSUE_TEMPLATE/task-chore.yml` |
| Package submission | `.github/ISSUE_TEMPLATE/package-submission.yml` |
| Package correction | `.github/ISSUE_TEMPLATE/package-correction.yml` |

## Required Workflow

Contributors and agents MUST follow this full lifecycle.

### Task setup (before implementation)

1. Inspect and confirm issue scope:
  `gh issue view <number> --repo agents-repo/registry`
2. Create a branch using the naming rule in this guide.
3. Push the branch to the remote repository.
4. Open a draft pull request with the required template sections before
  implementation commits. Pull requests MUST be created as drafts
  (`gh pr create --repo agents-repo/registry --draft`):

  ```bash
  gh pr create --repo agents-repo/registry --draft --title "..." \
    --body-file <file>
  ```

### Delivery (after draft PR)

1. Implement, validate, then hand off. After validation passes, the developer
  manually marks the pull request ready for review in GitHub. Agents MUST NOT
  merge pull requests into `main`, push directly to `main`, or mark pull
  requests ready for review.

All contributors MUST integrate changes to `main` only through merged pull
requests. Direct commits or pushes to `main` MUST NOT be used.

GitHub cannot open a pull request when the head and base branches are
identical. Before `gh pr create --draft`, push at least one commit on the task
branch so its head differs from `main` (for example
`git commit --allow-empty -m "chore: scaffold draft PR for #<issue-number>"`).
An empty commit is sufficient when no file changes are needed yet.
Implementation commits may follow on the same branch.

## Workflow exceptions

1. **Security vulnerabilities** — Follow the private advisory flow; no public
   tracking issue. Branch and draft pull request are still required before merge
   to `main`. In `## Related Issues`, use `Closes #<issue-number>` when
   maintainers provide a linked private or advisory tracking issue. Otherwise,
   reference the private security advisory identifier (for example `GHSA-...`)
   in `## Related Issues` and coordinate linkage with maintainers.
2. **Maintainer emergency hotfix** — Work on a `fix/<issue-number>-<slug>`
   branch only with prior maintainer approval documented in an issue or
   advisory. Do not use a separate `hotfix/` prefix. Delivery to `main` is
   still via merged pull request.
3. **Package submission** — External contributors SHOULD fork **agents-repo/registry**,
   work on the fork, and open a pull request from the fork to upstream `main`.
   A tracking issue on upstream is **recommended but not required** for package
   submissions and corrections. When an issue exists, branch
   `package/<issue-number>-<slug>` and include `Closes #<issue-number>` in the
   pull request. Without an issue, branch `package/<slug>` and describe the
   package in `## Related Issues`. Author package source on the task branch,
   open a draft pull request before substantive commits, then run
   `package:build` and `package:validate-artifacts` **before marking the pull
   request ready for review** (not before opening the draft PR).

See the organization [Required Workflow](https://github.com/agents-repo/.github/blob/main/CONTRIBUTING.md#required-workflow)
for shared norms.

## GitHub Communication Method (Preferred)

Contributors and agents SHOULD use `gh` CLI as the preferred method to
communicate with GitHub for issues and pull requests.

For long issue/PR descriptions, use `--body-file` to avoid shell escaping and
truncation issues.

Please report vulnerabilities privately with GitHub Private Vulnerability
Reporting instead of public GitHub issues, discussions, pull requests, or
public social channels (including X and Reddit). Use
`https://github.com/agents-repo/registry/security/advisories/new` for private
disclosure.

## Release Workflow

- Release versions use Semantic Versioning `MAJOR.MINOR.PATCH` sourced from
  <https://semver.org>.
- `PATCH` is the canonical term for backward-compatible bugfix releases.
- Pushes to `main` (post-merge integration via pull request, not direct push)
  run release validation checks and then execute `semantic-release`.
- Release jobs run only when `github.repository` is `agents-repo/registry`.
  On forks and other copies, `validate`, `release-dry-run`, and
  `release-publish` skip. GitHub still starts the workflow; skipped jobs are
  not the same as a disabled Actions tab.
- A release is published only when commit history includes releasable changes
  per the commit-to-version mapping below.
- `workflow_dispatch` remains available for operational checks on
  `agents-repo/registry`. Manual dispatch on a fork also skips all Release
  jobs.
- The `dry_run` input defaults to `true`; use `dry_run=false` only when an
  intentional manual publish is run from `main`.

The semantic version value remains `<MAJOR>.<MINOR>.<PATCH>`. Release tags may
use the common `v<MAJOR>.<MINOR>.<PATCH>` convention without changing the
underlying version value.

Commit-to-version mapping for automated releases. Custom release rules in
`.releaserc.json` map all `feat(package)` and `fix(package)` commits—including
`!` and `BREAKING CHANGE:` footers—to `PATCH`. Platform breaking changes use
commit-analyzer built-in default rules when no custom rule matches:

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

## Branch Naming

Branch names MUST follow the pattern `<prefix>/<issue-number>-<slug>`,
where `<slug>` is a short lowercase kebab-case description.

Package submissions without a tracking issue MAY use `package/<slug>` instead
of `package/<issue-number>-<slug>`.

| Issue type | Prefix | Example |
| --- | --- | --- |
| Bug or inconsistency | `fix/` | `fix/42-correct-manifest-artifact-rule` |
| Spec change request | `spec/` | `spec/7-add-contract-schema` |
| Feature proposal | `feat/` | `feat/15-search-index` |
| Task or chore | `chore/` | `chore/31-update-dependencies` |
| Documentation-only work (non-`specs/`) | `docs/` | `docs/88-update-readme` |
| Package submission (with issue) | `package/` | `package/56-my-package-name` |
| Package submission (no issue) | `package/` | `package/my-package-name` |

When using a tracking issue, create the issue first to obtain the issue number,
then open the branch.

See the organization [branch prefix reference](https://github.com/agents-repo/.github/blob/main/CONTRIBUTING.md#branch-prefix-reference)
for the canonical cross-repo mapping.

## Commit Message Convention

Before committing, contributors SHOULD classify the dominant intent of the
staged changes.

Commit category prefixes SHOULD match that intent and use this set:
`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
`chore`, `revert`.

Commit messages SHOULD follow this format:

- `category(subset): summary`

`subset` is optional and recommended when it improves clarity.

Breaking changes are not limited to `feat`; any category in the allowed set may
be breaking when the commit introduces incompatible behavior.

For breaking commits, contributors SHOULD use `!` immediately after `category`
or `category(subset)` in the header (for example, `fix!: ...` or
`refactor(parser)!: ...`). Breaking commits SHOULD include a `BREAKING CHANGE:`
footer describing migration impact.

For mixed-intent changes, contributors SHOULD split commits by intent. If not
split, use the primary intent category and describe the broader scope in the
pull request summary.

## Pull Request Expectations

1. Keep PRs focused and easy to review.
2. Every PR targeting `main` MUST include a tracking reference in
  `## Related Issues`: `Closes #<issue-number>` for standard tasks, or the
  security-advisory format described in **Workflow exceptions** when
  applicable. Package submission and correction pull requests MAY omit
  `Closes #` when no tracking issue was opened; describe the package in
  `## Related Issues` instead.
3. Use deterministic language for normative rules.
4. Include examples when changing specification behavior.
5. Use `.github/pull_request_template.md` for every PR, or if it cannot be
   applied programmatically, include its required sections manually in the PR
   body.

## Specification Changes

When updating files in specs/:

1. State the current rule and proposed rule clearly.
2. Describe compatibility impact.
3. Update any dependent examples or references.
4. Keep wording machine-readable and unambiguous.
5. Propagate changed definitions/rules to dependent specs, workflow templates,
  and documentation examples.
6. In the PR description, list dependent files checked and whether each surface
  was updated or intentionally left unchanged.

## Package Submission Expectations

Open a tracking issue when helpful (recommended for larger or ambiguous work,
optional for small self-contained pull requests):

- **New package or new package version:** `.github/ISSUE_TEMPLATE/package-submission.yml`
  (`feat(package):` issue and PR titles)
- **Correction to published package content:** `.github/ISSUE_TEMPLATE/package-correction.yml`
  (`fix(package):` issue and PR titles)

Issues MUST be opened on **agents-repo/registry** (upstream), not on a fork.

### Fork contributions

External contributors SHOULD:

1. Fork **agents-repo/registry** on GitHub.
2. Clone the fork, add `upstream` pointing at **agents-repo/registry**, and sync
   `main` from upstream before branching.
3. Create a task branch on the fork (`package/<issue-number>-<slug>` or
   `package/<slug>`).
4. Open a draft pull request with base **agents-repo/registry** `main` and head
   `YOUR_FORK_USER:branch` before substantive implementation commits.
5. Push implementation commits to the fork branch; keep the fork synced with
   upstream while work is in progress.

PR workflows (baseline checks, package validation, package-create smoke) still
run on forks. Release jobs skip unless the repository is
`agents-repo/registry`. Sync the fork's `main` from upstream so the skip
applies; until then, a fork with Actions enabled can still fail **Publish
GitHub Release** on push to `main`.

Org members with write access MAY branch on upstream directly; the fork flow is
still recommended for isolation.

See the [Submit a package](https://agents-repo.org/docs/submitting-a-package)
guide on agents-repo.org for a contributor-oriented walkthrough.

### Suggested authoring path

Package creation is AI-first. After the draft pull request is open, the
**suggested** path is to invoke **`full-package-creation-flow`** from the
in-tree `agents-repo/agents-repo-package-creation` package (extracted skills
and agents are already in the clone; see [README — IDE
Setup](../README.md#ide-setup)). The flow scaffolds with `package:create`,
authors source, reviews for submission readiness, and can run the required
pipeline below. The flow MAY exit after any step, so invoking it is not a
substitute for a completed pipeline.

Authors MAY still write package source files by hand. Either path MUST satisfy
the required pipeline and MUST NOT edit `versions/` manually.

### No manual edits under `versions/`

Contributors and AI agents MUST NOT manually create or modify any file under
`versions/`. All content under `versions/<version>/`, `versions/manifest.json`,
and the corresponding entry in `packages/index.json` is generated exclusively
by the `package-build` script.

### Protected branches

The following branches are protected for `--force-rebuild`:

- `main`
- `master`
- `release/*`

On a protected branch, `package-build` will not overwrite an existing version
snapshot. Publish a new semver instead.

### Required release pipeline

Package submissions follow the standard Required Workflow. Open a draft pull
request on the task branch, then create package source (suggested:
`full-package-creation-flow`). Completing the flow includes this pipeline;
the flow MAY exit early. Contributors MUST confirm the pipeline has run
**before marking the pull request ready for review**:

```bash
# 1. Build and publish a version snapshot
npm run package:build -- --package <namespace>/<package-id>

# 2. Deep artifact verification
npm run package:validate-artifacts -- --package <namespace>/<package-id>
```

The `package-build` script automatically runs preflight validation equivalent
to `package:validate` before building artifacts. These scripts remain
single-responsibility, and orchestration is handled externally
(for example CI or AI agents).

During development, contributors MAY run
`npm run package:validate -- --package <namespace>/<package-id>` manually
to check the working state before the package is ready to build.

The only files contributors and AI agents author directly are:

- `packages/<namespace>/<package-id>/metadata.json`
- `packages/<namespace>/<package-id>/README.md` (optional)
- `packages/<namespace>/<package-id>/agents/`
- `packages/<namespace>/<package-id>/flows/`

Do not author `detail.json`. `package-build` and `package-index-rebuild`
generate it from the latest snapshot. Do not author files under `versions/`.
All `versions/` artifacts are produced by `package-build`, except the
one-time README backfill described in `specs/versioning-rules.md`.

### Squash-merge title for registry release

When squash-merging a package submission PR, the resulting commit title
MUST use `feat(package):` for new packages or new package versions, or
`fix(package):` for corrections to published package content. You MAY use
`feat(package)!:` or `fix(package)!:` to emphasize breaking **package**
content in release notes when the published package semver is a breaking bump
(for example `1.x` → `2.x`). The `!` does **not** trigger a registry MAJOR;
all package-scoped titles publish a registry **PATCH** per `.releaserc.json`.

The PR title should match, since GitHub uses it as the default squash-merge
message. Maintainers MUST NOT edit the squash-merge message away from the
validated PR title when merging package PRs.

This format triggers a registry release tag so `v2.x` consumers receive the
updated `packages/index.json`. Registry-line breaking changes (layout, index
schema, namespace contract) MUST use platform commits (`feat!:`, spec changes),
not `feat(package)!:`.

CI enforces the PR title in the `pr-package-validation` workflow via
`npm run package:validate` when package directories change. Local
`package:validate` and `package:build` runs do not check the PR title unless
`GITHUB_EVENT_NAME=pull_request` and `GITHUB_EVENT_PATH` are set (as in CI).
Smoke and integration harnesses set `SKIP_PACKAGE_PR_TITLE_CHECK=1` so
unrelated PR titles do not fail tooling checks; that variable MUST NOT be set
in package submission CI.

### IDE setup

#### Project guidelines (repo-specific)

| Install target | Path | Source |
| --- | --- | --- |
| GitHub Copilot | `.github/copilot-instructions.md` | **Canonical** — edit here |
| Cursor | `.cursor/rules/agents-registry.mdc` | Mirrored from copilot-instructions |
| Claude Code | `CLAUDE.md` | Mirrored from copilot-instructions |
| OpenAI Codex | `AGENTS.md` | Mirrored from copilot-instructions |

Regenerate mirrors after editing `copilot-instructions.md`:

```bash
npm run sync:ide-instructions
```

Do not edit `.cursor/rules/`, `CLAUDE.md`, or `AGENTS.md` directly.

#### Registry workflow packages (CLI)

Install and refresh catalog packages with the [agents-repo CLI](https://github.com/agents-repo/cli).
`agents.json` points at `https://registry-proxy.maiconfz.workers.dev` (organization
catalog proxy).

Bootstrap only when `agents.json` is missing (one-time; use a published CLI
release or `npm exec agents-repo -- init` after `npm ci`):

```bash
npm exec agents-repo -- init --targets github-copilot claude-code cursor openai-codex
```

Use the npm scripts for bulk install, update, and CI (CLI version is pinned in
`package.json` / `package-lock.json`, distinct from registry packages in
`agents-lock.json`):

```bash
npm run agents:install   # bulk sync from agents.json
npm run agents:update    # refresh within semver ranges
npm run agents:ci        # same command pr-baseline uses after npm ci
```

Commit `agents.json`, `agents-lock.json`, and extracted paths (`.github/agents/`,
`.cursor/skills/`, `.claude/agents/`, `.agents/skills/`). Do not hand-edit
extracted package files.

Dogfooded packages:

- `agents-repo/agents-repo-package-creation` — all four IDE targets
- `maiconfz/github-pr-review-triage` — all four IDE targets
- `maiconfz/github-interactive-issue-implementation-planner` — all four IDE targets

Local pre-commit checks project guideline mirrors (`sync:ide-instructions
--check`). CI runs `npm run agents:ci` to reinstall registry packages
from the committed lock and fail on extract or lock drift (not semver-max
`install`).

Changes under `.github/workflows/` MUST pass `npm run lint:workflows`
(included in `npm run lint:all`). See the organization
[GitHub Actions workflow linting](https://github.com/agents-repo/.github/blob/main/CONTRIBUTING.md#github-actions-workflow-linting)
norm. When bumping `ACTIONLINT_VERSION` in `scripts/lint-workflows.mjs`, replace
`scripts/actionlint_<version>_checksums.txt` with the matching file from the
[actionlint GitHub release](https://github.com/rhysd/actionlint/releases) and
remove the previous version's checksums file. Keep the same pin across
organization repositories.

### Submitted package checklist

A package submission should include:

- updated `packages/index.json` entry (generated by `package-build`)
- required package source files (`metadata.json`, `agents/`, `flows/`)
- optional package root documentation (`README.md`)
- valid metadata with all required fields per
  [specs/metadata-schema.md](../specs/metadata-schema.md), including:
  - Package metadata: `status` (one of `active`, `deprecated`,
    `archived`, `yanked`), `category` (non-empty string), and
    `estimateOverallCost` (object with required `band` — one of
    `minimal`, `low`, `moderate`, `high`, `critical`, or `mixed` —
    and optional integer `estimatedCost` on a 1–10 scale)
  - Agent and flow metadata: `status`, `category`, and `estimateCost`
    (object with required `band` — one of `minimal`, `low`, `moderate`,
    `high`, `critical` — and required integer `estimatedCost` on a 1–10 scale)
- `quickstart`, when present, should point to package root `README.md`
- supported `schemaVersion` values in `metadata.json` and in every
  `.metadata.json` sidecar (agent and flow), per `specs/schema-versions.json`
- no use of end-of-life schema versions; deprecated schema versions are
  allowed but should be migrated
- unique agent and flow IDs across both `agents/` and `flows/` within a
  package, to avoid collisions when deployment ZIP content is flattened into
  a single `agents/` directory
- a shared root frontmatter `version` across all `.agent.md` files in
  `agents/` and `flows/`, matching `metadata.json` `version`
- `versions/<version>/` snapshot generated by `npm run package:build`
  (never manually authored), including `README.md` when the package had
  one at release
- generated `detail.json` (never manually authored)
- source archive (`<version>-src.zip`) generated by `npm run package:build`,
  excluding `versions/` and `detail.json`
- package, agent, and flow content licensed under MIT
- only content the contributor authored or can submit under MIT

The version snapshot folder MUST be treated as immutable after publication.
No file inside a released version folder may be modified or removed, except
the one-time README backfill in `specs/versioning-rules.md`.

Submitted package content is accepted only under the MIT license.
Do not submit third-party content unless you have the right to
submit and redistribute it under the MIT license.

## Validation

Before requesting review:

1. Run markdown lint checks and fix warnings (`npm run lint:md`).
2. Run Sonar lint checks for TypeScript and JSON/JSONC files
  (`npm run lint:sonar`).
3. Run unit tests (`npm run test:run`).
4. Run type checks (`npm run typecheck`).
5. Run the repo-wide package ZIP scan (`npm run package:scan-zips`).
6. When IDE mirror sources change, run:

   ```bash
   npm run sync:ide-instructions -- --check
   rm -rf .github/agents .cursor/skills .claude/agents .agents/skills
   npm run agents:ci
   DRIFT_PATHS="agents.json agents-lock.json .github/agents \
     .cursor/skills .claude/agents .agents/skills"
   git diff --exit-code -- $DRIFT_PATHS
   test -z "$(git status --porcelain -- $DRIFT_PATHS)"
   ```

7. Ensure references and paths are valid.
8. Confirm no unrelated changes are included.

SonarQube Cloud Automatic Analysis is separate from `npm run lint:sonar`
(eslint-plugin-sonarjs). Automatic Analysis reads `.sonarcloud.properties`,
not `sonar-project.properties`. `sonar.sources` and `sonar.tests` must be
disjoint directory lists (no wildcards). Do not set `sonar.sources` to `.`
while `sonar.tests` lists nested directories; analysis fails with
`Source and test paths overlap`. This repository sets
`sonar.sources=scripts,specs,packages` and `sonar.tests=test,tests`, and
excludes generated snapshots with `**/versions/**`. Coverage report paths are
unsupported under Automatic Analysis.

When changes affect behavior under `scripts/lib/`, contributors SHOULD add or
update unit tests under mirrored paths in `tests/unit/`.
For full test layout conventions and scope guidance, see `tests/README.md`.

## Code Owners and Reviews

Review routing is defined in CODEOWNERS.
At least one code owner review is recommended for spec changes.
