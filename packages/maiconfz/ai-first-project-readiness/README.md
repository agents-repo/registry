# ai-first-project-readiness

Analyze a project's AI-first readiness (architecture, docs, agents, skills,
tooling) and, after user consent, draft a phased or full-shot improvement
plan. Includes talk-only web chat. Planning only; does not implement.

## Quickstart

Use this package as a starting point for agents and flows in the registry.

## Package Contents

- Agents and flows under this package root
- Metadata contract in `metadata.json`

## Usage

Run build and validation commands from the repository root:

```bash
npm run package:build -- --package maiconfz/ai-first-project-readiness
npm run package:validate-artifacts -- \
  --package maiconfz/ai-first-project-readiness --version 1.0.0
```

The build script automatically runs preflight validation before generating
artifacts.
