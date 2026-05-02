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

## Lint

Run `npm run lint:md` before committing. Pre-commit hook enforces this automatically.

## Contribution

Open an issue using `.github/ISSUE_TEMPLATE/` forms before any change.
See `.github/CONTRIBUTING.md` for the full workflow.
