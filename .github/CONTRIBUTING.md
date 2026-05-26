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

## GitHub Communication Method (Preferred)

Contributors and agents SHOULD use `gh` CLI as the preferred method to
communicate with GitHub for issues and pull requests.

Recommended flow:

1. Inspect and confirm issue scope:
  `gh issue view <number> --repo agents-repo/registry`
2. Create a branch using the naming rule in this guide.
3. Open a draft pull request with the required template sections:
  `gh pr create --repo agents-repo/registry --draft --title "..." \
  --body-file <file>`

For long issue/PR descriptions, use `--body-file` to avoid shell escaping and
truncation issues.

Security vulnerabilities MUST NOT be reported in public issues. Use
`https://github.com/agents-repo/registry/security/advisories/new` for private
disclosure.

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
2. If a PR is linked to a tracking issue, it MUST include
  `Closes #<issue-number>` in the `## Related Issues` section.
3. If a PR is not tied to a tracking issue, it MAY omit `Closes`, but SHOULD
  include a short rationale in the PR body.
4. Use deterministic language for normative rules.
5. Include examples when changing specification behavior.
6. Use `.github/pull_request_template.md` for every PR, or if it cannot be
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

A package submission MUST use the following pipeline before opening a PR:

```bash
# 1. Build and publish a version snapshot
npm run package:build -- --package <id>

# 2. Deep artifact verification
npm run package:validate-artifacts -- --package <id>
```

The `package-build` script automatically runs preflight validation equivalent
to `package:validate` before building artifacts. These scripts remain
single-responsibility, and orchestration is handled externally
(for example CI or AI agents).

During development, contributors MAY run
`npm run package:validate -- --package <id>` manually to check the working
state before the package is ready to build.

The only files contributors and AI agents author directly are:

- `packages/<id>/metadata.json`
- `packages/<id>/README.md` (optional)
- `packages/<id>/agents/`
- `packages/<id>/flows/`

All `versions/` artifacts are produced by step 2.

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
