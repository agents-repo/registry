# Contributing

Thanks for contributing to the Copilot Agents Registry.

## Project Focus

This repository is a registry and specification source of truth.
Most contributions are documentation, schema, and package-structure changes.

## Before You Start

1. Open an issue using the appropriate issue form.
2. Confirm scope and acceptance criteria.
3. Align on whether the change is breaking or non-breaking.

Issue form selection MUST match the task type. Contributors MUST use the
matching form in `.github/ISSUE_TEMPLATE/` when tooling can apply it directly;
otherwise, they MUST manually include the intended template's sections in the
issue body.

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
  `gh pr create --repo agents-repo/registry --draft --title "..." \
  --body-file <file>`

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
   in the PR body and coordinate linkage with maintainers.
2. **Maintainer emergency hotfix** — Hotfix branch work requires prior
   maintainer approval documented in an issue or advisory. Delivery to `main`
   is still via merged pull request.
3. **Package submission** — Follow the standard Required Workflow (issue →
   branch → draft PR). Author package source on the task branch, then run
   `package:build` and `package:validate-artifacts` **before marking the pull
   request ready for review** (not before opening the draft PR).

See the organization [Required Workflow](https://github.com/agents-repo/.github/blob/main/CONTRIBUTING.md#required-workflow)
for shared norms.

## GitHub Communication Method (Preferred)

Contributors and agents SHOULD use `gh` CLI as the preferred method to
communicate with GitHub for issues and pull requests.

For long issue/PR descriptions, use `--body-file` to avoid shell escaping and
truncation issues.

Security vulnerabilities MUST NOT be reported in public issues. Use
`https://github.com/agents-repo/registry/security/advisories/new` for private
disclosure.

## Release Workflow

- Release versions use Semantic Versioning `MAJOR.MINOR.PATCH` sourced from
  <https://semver.org>.
- `PATCH` is the canonical term for backward-compatible bugfix releases.
- Pushes to `main` (post-merge integration via pull request, not direct push)
  run release validation checks and then execute `semantic-release`.
- A release is published only when commit history includes releasable changes
  per the commit-to-version mapping below.
- `workflow_dispatch` remains available for operational checks.
- The `dry_run` input defaults to `true`; use `dry_run=false` only when an
  intentional manual publish is run from `main`.

The semantic version value remains `<MAJOR>.<MINOR>.<PATCH>`. Release tags may
use the common `v<MAJOR>.<MINOR>.<PATCH>` convention without changing the
underlying version value.

Commit-to-version mapping for automated releases. Custom release rules in
`.releaserc.json` override `feat(package):` to `PATCH` and breaking changes
to `MAJOR`; all other types use commit-analyzer built-in default rules when
no custom rule matches:

- `type!:` or `BREAKING CHANGE:` => `MAJOR`
- `feat(package):` => `PATCH` (catalog addition or new package version)
- `feat:` with any other or no scope => `MINOR` (platform or tooling changes)
- `fix:`, `perf:`, and `revert:` with any scope => `PATCH`

Use `fix(package):` for package corrections; it maps to `PATCH` like any
other `fix:` commit.

Commit types not listed above do not trigger an automated release.

## Branch Naming

Branch names MUST follow the pattern `<prefix>/<issue-number>-<slug>`,
where `<slug>` is a short lowercase kebab-case description.

| Issue type | Prefix | Example |
| --- | --- | --- |
| Bug or inconsistency | `fix/` | `fix/42-correct-manifest-artifact-rule` |
| Spec change request | `spec/` | `spec/7-add-contract-schema` |
| Feature proposal | `feat/` | `feat/15-search-index` |
| Task or chore | `chore/` | `chore/31-update-dependencies` |
| Package submission | `package/` | `package/56-my-package-name` |

Create the issue first to obtain the issue number, then open the branch.

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
  applicable.
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

Open a tracking issue before starting work:

- **New package or new package version:** `.github/ISSUE_TEMPLATE/package-submission.yml`
  (`feat(package):` issue and PR titles)
- **Correction to published package content:** `.github/ISSUE_TEMPLATE/package-correction.yml`
  (`fix(package):` issue and PR titles)

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
request on the task branch, author package source, then run this pipeline
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

All `versions/` artifacts are produced by step 2.

### Squash-merge title for registry release

When squash-merging a package submission PR, the resulting commit title
MUST use `feat(package):` for new packages or new package versions, or
`fix(package):` for corrections to published package content. Breaking
registry releases MAY use `feat(package)!:` or `fix(package)!:` instead.
The PR title should match, since GitHub uses it as the default squash-merge
message. Maintainers MUST NOT edit the squash-merge message away from the
validated PR title when merging package PRs.

This format triggers a registry release tag so `v2.x` consumers receive the
updated `packages/index.json`. Non-breaking package merges map to a registry
`PATCH`; breaking `feat(package)!:` / `fix(package)!:` titles map to
registry `MAJOR` per `.releaserc.json`.

CI enforces the PR title in the `pr-package-validation` workflow via
`npm run package:validate` when package directories change. Local
`package:validate` and `package:build` runs do not check the PR title unless
`GITHUB_EVENT_NAME=pull_request` and `GITHUB_EVENT_PATH` are set (as in CI).
Smoke and integration harnesses set `SKIP_PACKAGE_PR_TITLE_CHECK=1` so
unrelated PR titles do not fail tooling checks; that variable MUST NOT be set
in package submission CI.

### IDE deployment mirrors (repo dogfooding)

Committed IDE paths are generated from canonical sources:

| Path | Source |
| --- | --- |
| `.github/agents/*.agent.md` | `packages/agents-repo/agents-repo-package-creation/` and `packages/maiconfz/pr-comment-triage/` (`agents/` + `flows/`) |
| `.cursor/skills/<id>/SKILL.md` | same package sources |
| `.cursor/rules/agents-registry.mdc` | `.github/copilot-instructions.md` |

Regenerate after source edits:

```bash
npm run package:sync-ide-targets -- \
  --package agents-repo/agents-repo-package-creation \
  --target all

npm run package:sync-ide-targets -- \
  --package maiconfz/pr-comment-triage \
  --target github-copilot

npm run package:sync-ide-targets -- \
  --package maiconfz/pr-comment-triage \
  --target cursor
```

When only `copilot-instructions.md` changes:

```bash
npm run sync:cursor-rules
```

Do not edit deployment mirrors directly. `package:sync-ide-targets` updates
repo IDE files only; it does not replace `package:build` for `versions/` snapshots.

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
  (never manually authored)
- package, agent, and flow content licensed under MIT
- only content the contributor authored or can submit under MIT

The version snapshot folder MUST be treated as immutable after publication.
No file inside a released version folder may be modified or removed.

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
6. Ensure references and paths are valid.
7. Confirm no unrelated changes are included.

When changes affect behavior under `scripts/lib/`, contributors SHOULD add or
update unit tests under mirrored paths in `tests/unit/`.
For full test layout conventions and scope guidance, see `tests/README.md`.

## Code Owners and Reviews

Review routing is defined in CODEOWNERS.
At least one code owner review is recommended for spec changes.
