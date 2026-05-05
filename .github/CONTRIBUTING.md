# Contributing

Thanks for contributing to the Copilot Agents Registry.

## Project Focus

This repository is a registry and specification source of truth.
Most contributions are documentation, schema, and package-structure changes.

## Before You Start

1. Open an issue using the appropriate issue form.
2. Confirm scope and acceptance criteria.
3. Align on whether the change is breaking or non-breaking.

Issue form selection MUST match the task type and MUST use one form in
`.github/ISSUE_TEMPLATE/`.

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

## Pull Request Expectations

1. Keep PRs focused and easy to review.
2. Link related issues in the PR body.
3. Use deterministic language for normative rules.
4. Include examples when changing specification behavior.
5. Use `.github/pull_request_template.md` for every PR.

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

A package submission should include:

- updated `packages/index.json` entry for the new or updated package,
  including the package record and its `updatedAt` value
- required package files
- valid metadata and manifest entries
- `schemaVersion: "1.0.0"` in `metadata.json` and in every
  `.metadata.json` sidecar (agent and flow)
- semantic version and artifact paths
- unique agent and flow IDs across both `agents/` and `flows/` within a
  package, to avoid collisions when deployment ZIP content is flattened into
  a single `agents/` directory
- a shared root frontmatter `version` across all `.agent.md` files in
  `agents/` and `flows/`, aligned with `versions/manifest.json` `latest`
  for the release being submitted
- SHA-256 checksums for both the deployment artifact and source archive
- a version snapshot folder at `versions/<version>/` containing:
  - `metadata.json` — verbatim copy of the package metadata at release time
  - `agents/` — verbatim copy of the agents source tree at release time
  - `flows/` — verbatim copy of the flows source tree at release time
    (if the package contains flows)
  - `<version>.zip` — the deployment artifact
  - `<version>-src.zip` — the source archive
- package, agent, and flow content licensed under MIT
- only content the contributor authored or can submit under MIT

The version snapshot folder MUST be treated as immutable after publication.
No file inside a released version folder may be modified or removed.

Submitted package content is accepted only under the MIT license.
Do not submit third-party content unless you have the right to
submit and redistribute it under the MIT license.

## Validation

Before requesting review:

1. Run markdown lint checks and fix warnings.
2. Ensure references and paths are valid.
3. Confirm no unrelated changes are included.

## Code Owners and Reviews

Review routing is defined in CODEOWNERS.
At least one code owner review is recommended for spec changes.
