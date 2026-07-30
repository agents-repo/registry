# agents-repo-package-creation

Agents and a flow for creating, reviewing, and validating new registry packages
for agents-repo from requirements to submission-ready source.

## Install

Install with the [agents-repo CLI](https://github.com/agents-repo/cli):

```bash
npx agents-repo@1.13.0 init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@1.13.0 install agents-repo/agents-repo-package-creation
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after install.
All four supported IDE targets receive the package content (rendered per target).

This README documents the package on the registry catalog. Installed content
comes from the versioned ZIPs pinned in your `agents-lock.json`.

## Usage

Invoke the **`full-package-creation-flow`** flow when you need end-to-end package
scaffolding, authoring, validation, build, and submission review. Individual
agents are available for single steps (requirements analysis, script execution,
release gate, and submission review).

## Package contents

| Asset | Role |
| --- | --- |
| `full-package-creation-flow` (flow) | End-to-end package creation pipeline |
| `package-requirements-analyst` | Blueprint from user intent |
| `package-creator` | Author agent and flow source files |
| `package-script-runner` | Run registry package scripts |
| `package-release-gate` | Artifact validation gate |
| `package-submission-reviewer` | Human-facing submission readiness review |

## Validate and build

From the registry repository root:

```bash
PKG=agents-repo/agents-repo-package-creation
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```
