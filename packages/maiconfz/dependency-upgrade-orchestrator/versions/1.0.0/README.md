# dependency-upgrade-orchestrator

Polyglot **dependency scan → plan → upgrade → test → fix** for the host git
repository. Ask-first planning, optional GitHub/GitLab dedup and migration
research, then controlled ship-mode on a feature branch.

This package complements **Renovate** and **Dependabot** (scheduled bump PRs);
it does not replace them. Use it when you want an agent-led, cross-ecosystem
pass with local validation and fix loops.

## Install

From the [agents-repo CLI](https://github.com/agents-repo/cli):

```bash
npx agents-repo@latest init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@latest install maiconfz/dependency-upgrade-orchestrator
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after install.

## Usage

| Flow | When |
| --- | --- |
| `dependency-upgrade-planning` | Audit and plan only (no file changes) |
| `dependency-upgrade-orchestration` | Full workflow after you approve the plan |

Suggested workflow:

1. Run **`dependency-upgrade-planning`** (optional `enable-github: true`).
2. Refine the plan with **`maiconfz/plan-refiner`** on large upgrades.
3. Run **`dependency-upgrade-orchestration`** with `approved-plan`, `dry-run: true`.
4. Re-run with `dry-run: false` to commit and push on your feature branch.
5. Optionally **`maiconfz/review-fix-ship`** then **`maiconfz/github-pr-review-triage`**.

Work from a **feature branch** in the project you are upgrading (not `main`).

### Flow inputs (orchestration)

| Input | Notes |
| --- | --- |
| `scope` | `patch-minor` (default), `major-allowed`, `all`, `security-only` (best-effort in v1) |
| `ecosystems` | Optional filter, e.g. `npm,gradle` |
| `allow-web-research` | Major-bump migration guides |
| `enable-github` / `enable-gitlab` | Remote dedup for open bump work |
| `dry-run` | `true` = no commit/push in validate/fix phase |
| `approved-plan` | Resume from a prior plan markdown |
| `custom-instructions` | Pins, skips, monorepo roots |

## Prerequisites

| Tool | Purpose |
| --- | --- |
| Host package managers | npm, pnpm, yarn, pip, poetry, uv, gradle, mvn, cargo, go, composer, bundle, dotnet — as detected |
| `gh` | Optional GitHub remote dedup |
| `glab` or `GITLAB_TOKEN` | Optional GitLab dedup |
| `cargo outdated` | Optional Cargo inventory |
| Maven Versions plugin / Gradle dependencyUpdates | Optional JVM inventory |

Validation commands come from the **host** repo: `CONTRIBUTING`, CI, and
`package.json` scripts.

## Ecosystem matrix (v1)

| Ecosystem | Detection | Outdated | Upgrade |
| --- | --- | --- | --- |
| npm / yarn / pnpm / bun | `package.json` + lockfile | `npm outdated`, etc. | PM-specific update |
| pip / pip-tools | `requirements*.txt` | `pip list --outdated` | pins + compile |
| Poetry | `pyproject.toml` | `poetry show --outdated` | `poetry update` |
| uv | `uv.lock` | uv list/lock commands | uv lock/sync |
| Gradle | `build.gradle*`, catalog | dependencyUpdates / diff | catalog bump |
| Maven | `pom.xml` | `versions:display-dependency-updates` | controlled versions goals |
| Cargo | `Cargo.toml` | `cargo outdated` | `cargo update` |
| Go | `go.mod` | `go list -m -u all` | `go get` |
| Composer | `composer.json` | `composer outdated` | `composer update` |
| Bundler | `Gemfile` | `bundle outdated` | `bundle update` |
| .NET | csproj / central props | `dotnet list package --outdated` | package bump |

Missing CLIs are called out in the plan as manual steps.

## Non-goals (v1)

- Replacing Renovate/Dependabot automation
- OSV/Snyk-accurate `security-only` scope (deferred)
- Upgrading OS runtimes unless you request it in `custom-instructions`

## Package contents

| Asset | Role |
| --- | --- |
| `dependency-upgrade-orchestration` | Primary flow |
| `dependency-upgrade-planning` | Planning-only flow |
| `workspace-ecosystem-scanner` | Detect managers and roots |
| `upgrade-candidate-analyst` | Outdated inventory |
| `test-surface-analyst` | Host validation map |
| `upgrade-planner` | Ordered upgrade plan |
| `upgrade-executor` | Apply approved batches |
| `upgrade-validation-fixer` | Test, fix, commit, push |
| `remote-upgrade-tracker` | GitHub/GitLab dedup |
| `upgrade-migration-researcher` | Migration research |

## Validate and build (registry maintainers)

From the registry repository root:

```bash
PKG=maiconfz/dependency-upgrade-orchestrator
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```
