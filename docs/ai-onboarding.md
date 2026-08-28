# AI onboarding — Agents Registry

First-5-minutes guide for AI contributors working in **agents-repo/registry**.

## Commands

```bash
corepack enable npm
corepack prepare npm@12.0.1 --activate
npm ci
npm run env:check
```

Review tasks:

```bash
npm run lint:md
npm run lint:sonar
npm run test:run
npm run typecheck
npm run package:scan-zips
npm run sync:ide-instructions -- --check
```

Package tasks (replace `<namespace>/<package-id>` and `<version>`):

```bash
npm run package:validate -- --package <namespace>/<package-id>
npm run package:build -- --package <namespace>/<package-id>
npm run package:validate-artifacts -- \
  --package <namespace>/<package-id> --version <version>
```

## Skill routing

| Task type | Start here |
| --- | --- |
| New or updated package | `full-package-creation-flow` skill chain |
| Package validation only | `package-script-runner` |
| Platform/spec/tooling change | `issue-implementation-planner` or task-chore issue |
| Readiness audit | `ai-readiness-analyst` |

Package skills live under `.agents/skills/` (see `package-*` skills). Do not
hand-edit extracted mirrors; update `agents.json` and run `npm run agents:ci`.

## Package PR handoff

For package submissions, local handoff before ready-for-review MUST include:

1. `package:validate`
2. `package:build`
3. `package:validate-artifacts`

CI `pr-package-validation` runs `package:validate` only — artifact build and
verification remain contributor responsibility before marking ready for review.
See [.github/CONTRIBUTING.md — Package Submission Expectations](../.github/CONTRIBUTING.md#package-submission-expectations).

## Package create smoke test

The package golden path (scaffold → validate → build → verify) is covered by
[`tests/integration/package-create-flow.test.ts`](../tests/integration/package-create-flow.test.ts).
See [`tests/README.md`](../tests/README.md) for layout conventions.

## Specs

All normative rules are under `specs/`. Start from
[.github/copilot-instructions.md](../.github/copilot-instructions.md) specs index
before editing package layout or metadata.
