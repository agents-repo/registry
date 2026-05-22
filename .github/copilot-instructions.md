# Copilot Agents Registry — Project Guidelines

## Project Purpose

This is a spec-first, data-first open-source registry for GitHub Copilot agents
and multi-agent flows. All structural rules are normative and encoded in `specs/`.
Runtime logic is out of scope.

## Specs Index

All normative rules live in `specs/`. Defer to these before inventing rules.

- `specs/package-format.md` — directory layout, naming rules, ZIP artifact rules
- `specs/agent-format.md` — agent file structure, frontmatter fields, body sections
- `specs/flow-format.md` — flow file structure, agent references
- `specs/metadata-schema.md` — `metadata.json` schema for package, agent, and flow
- `specs/manifest-schema.md` — `versions/manifest.json` schema and SHA-256 rules
- `specs/versioning-rules.md` — semver policy, immutability, deprecation

## Critical Conventions

- Agent and flow source files use the `.agent.md` extension (required by GitHub
  Copilot)
- Frontmatter `name` MUST equal the stem before `.agent.md` (e.g. `name: planner`
  for `planner.agent.md`)
- IDs are lowercase kebab-case: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- ZIP version names have no `v` prefix: `1.0.0.zip` not `v1.0.0.zip`
- Spec text uses RFC 2119 keywords: MUST, MUST NOT, SHOULD, SHOULD NOT, MAY

## Change Propagation and Consistency Gate

When a change updates definitions, normative rules, schema fields, file
locations, naming rules, artifact semantics, or version semantics, the agent
MUST run a cross-file consistency pass before task completion.

Minimum required dependency checks:

- `specs/package-format.md`, `specs/manifest-schema.md`, and
  `specs/versioning-rules.md` for layout, artifact, and version consistency
- `specs/agent-format.md`, `specs/flow-format.md`, and
  `specs/metadata-schema.md` for duplicated field contracts and
  name/version/license alignment
- `.github/CONTRIBUTING.md`, `.github/pull_request_template.md`,
  `.github/ISSUE_TEMPLATE/spec-change.yml`, and `README.md` for workflow and
  documentation consistency
- any changed `metadata.json` and `versions/manifest.json` examples

The agent MUST either update each inconsistent dependent surface or explicitly
state why no update is required for that surface.

A spec-definition task MUST NOT be considered complete until the final response
lists which dependent files were checked and what changed (or why no change was
needed).

The package submission issue template is out of scope unless the changed rule
directly modifies package submission requirements.

## Lint

Run `npm run lint:md` before committing. If local git hooks are installed, the
pre-commit hook may also run this check.

## Copilot Runtime Environment

Copilot tasks in this repository MUST use the pinned runtime below to avoid
tooling drift.

- Node.js: `24.15.0` (see `.nvmrc`)
- npm: `11.12.1` (see `package.json` `packageManager`)

Before running package or review tasks, execute:

1. `corepack enable`
2. `corepack prepare npm@11.12.1 --activate`
3. `npm ci`
4. `npm run env:check`

For review tasks, run:

1. `npm run lint:md`
2. `npm run lint:sonar`
3. `npm run test:run`
4. `npm run typecheck`
5. `npm run package:scan-zips`

When adding or updating tests, follow `tests/README.md` for test layout,
path mirroring conventions, and scope guidance.

For package tasks, run in order:

1. `npm run package:validate -- --package <id>`
2. `npm run package:build -- --package <id>`
3. `npm run package:validate-artifacts -- --package <id> --version <version>`

## Contribution

Open an issue using `.github/ISSUE_TEMPLATE/` forms before any change.
See `.github/CONTRIBUTING.md` for the full workflow.

## Issue and PR Template Enforcement

When opening tracking issues, the agent MUST use the issue form under
`.github/ISSUE_TEMPLATE/` that matches the task type:

- bug or inconsistency: `.github/ISSUE_TEMPLATE/bug-inconsistency.yml`
- spec change: `.github/ISSUE_TEMPLATE/spec-change.yml`
- feature proposal: `.github/ISSUE_TEMPLATE/feature-proposal.yml`
- task or chore: `.github/ISSUE_TEMPLATE/task-chore.yml`
- package submission: `.github/ISSUE_TEMPLATE/package-submission.yml`

When opening a pull request, the agent MUST follow
`.github/pull_request_template.md`.

The agent MUST report template usage in its final PR handoff summary,
including which issue form was used and confirmation that the PR body
follows `.github/pull_request_template.md`.

If the available tool path cannot programmatically apply a template, the
agent MUST explicitly state that limitation and MUST include all required
sections from the intended template in the issue or PR body.
