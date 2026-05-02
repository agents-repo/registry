# Contributing

Thanks for contributing to the Copilot Agents Registry.

## Project Focus

This repository is a registry and specification source of truth.
Most contributions are documentation, schema, and package-structure changes.

## Before You Start

1. Open an issue using the appropriate issue form.
2. Confirm scope and acceptance criteria.
3. Align on whether the change is breaking or non-breaking.

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

## Specification Changes

When updating files in specs/:

1. State the current rule and proposed rule clearly.
2. Describe compatibility impact.
3. Update any dependent examples or references.
4. Keep wording machine-readable and unambiguous.

## Package Submission Expectations

A package submission should include:

- required package files
- valid metadata and manifest entries
- semantic version and artifact path
- SHA-256 checksum for artifacts
- package, agent, and flow content licensed under MIT
- only content the contributor authored or can submit under MIT

Submitted package content is accepted only under the MIT license.
Do not submit third-party content unless you have the right to
redistribute it under MIT-compatible terms.

## Validation

Before requesting review:

1. Run markdown lint checks and fix warnings.
2. Ensure references and paths are valid.
3. Confirm no unrelated changes are included.

## Code Owners and Reviews

Review routing is defined in CODEOWNERS.
At least one code owner review is recommended for spec changes.
