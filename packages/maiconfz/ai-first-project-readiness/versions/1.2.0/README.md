# ai-first-project-readiness

Audit AI-first and harness readiness: context efficiency, pre-action guidance,
post-action feedback loops, and machine-readable specs. After user consent,
draft a phased or full-shot improvement plan. Chat-web can analyze public URLs
and uploads. Planning only; does not implement.

This is a `maiconfz` community package, not an official agents-repo product.
Installed agents reply in the **language the user used** (English if mixed
or unclear).

## Harness readiness model

A healthy agent harness combines two complementary halves:

- **Pre-action guidance** — clear boundaries, specs, modular rule artifacts,
  and index-based context routing so agents start with signal, not noise.
- **Post-action feedback loops** — automated validators (typecheck, lint,
  test, build) the agent can run to verify its own work.

This package audits both halves plus context efficiency and machine-readable
specs. It does not implement changes; it reports findings, scores, and
remediation templates.

## Scoring rubric

Reports include a weighted 0–100 scorecard:

| Category | Weight | What it measures |
| --- | --- | --- |
| Context Efficiency | 30% | Index-based `AGENTS.md`, `.cursorignore`, anti-bloat rules |
| Sensors and Automated Feedback | 30% | Typecheck, lint, test, build scripts, task-completion criteria |
| Guides and Structural Clarity | 25% | Architecture, entry points, docs, agent inventory |
| Machine-Readable Specs | 15% | `llms.txt`, schemas, types, eval harness |

**Overall** = `round(0.30*A + 0.30*B + 0.25*C + 0.15*D)`.

When a pillar lacks evidence, it is marked `insufficient-evidence`, omitted
from the overall score, and remaining weights are renormalized.

## What the auditor checks

**Context Efficiency** — flags monolithic always-on instruction files
(`.cursorrules`, bloated `AGENTS.md`), missing `.cursorignore`, and
cross-target duplication. Recommends `maiconfz/context-token-reduction` for
deep token-footprint analysis.

**Sensors and Automated Feedback** — looks for deterministic validation
scripts (`npm run typecheck`, `make test`, etc.) and documented
task-completion criteria.

**Guides and Structural Clarity** — checks modular architecture, specs,
ADRs, session onboarding, and ask-first rules.

**Machine-Readable Specs** — checks for `llms.txt`, JSON schemas, OpenAPI,
strict types, and eval or golden-task harnesses.

## Remediation outputs

When gaps are found, the report includes markdown templates (not auto-written
files):

- Trimmed index-based `AGENTS.md` when missing or bloated
- Optimized `.cursorignore` when missing or weak
- Suggested validation scripts block when sensors are missing

## Complementary tooling

| Package | Use when |
| --- | --- |
| `maiconfz/ai-first-project-readiness` | Broad harness and AI-first readiness audit with scoring |
| `maiconfz/context-token-reduction` | Deep always-on token footprint and context-waste reduction |

## Install

Prefer the official [agents-repo CLI](https://github.com/agents-repo/cli).

Greenfield (no usable `agents.json` targets yet):

```bash
npx agents-repo@latest init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@latest install maiconfz/ai-first-project-readiness
```

Already configured (targets present in `agents.json`):

```bash
npx agents-repo@latest install maiconfz/ai-first-project-readiness
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after install.
All four supported IDE targets receive the package content (rendered per
target).

## Usage

Two entry paths:

- **Workspace (IDE):** run `ai-first-project-planning` in the **host
  project**. It analyzes the tree, shows a scored readiness report, **asks
  before planning**, then drafts a phased or full-shot plan. It does not
  create files.
- **Chat-web:** use `ai-first-chat`. It interviews from what you say, or
  analyzes **public git-forge/project URLs** (not marketing pages),
  **uploads**, and **pasted sources** into a structured scored readiness
  report. It does not plan. For a full tree walk and ask-first planning,
  install this package in an IDE and run the flow there.

Standalone workspace agents:

- `ai-readiness-analyst` — inspect the host tree; write a scored readiness
  report with remediation templates. Does not plan.
- `improvement-planner` — plan only after `planning-consent` is true.
  Requires a `readiness-report` and `plan-mode` (`phased` or
  `full-shot`).

`ai-first-chat` is not part of the flow. Informal chat outlines without
evidence are **conversation-only** and are not improvement plans. A
chat-web readiness report is remote-or-upload evidence, not a host-tree
plan.

## Package contents

- `ai-readiness-analyst` — host-tree harness readiness report
- `improvement-planner` — ask-first phased or full-shot plan
- `ai-first-chat` — chat-web analysis from URLs, uploads, or conversation
- `ai-first-project-planning` (flow) — analyze, ask, plan

## Chat-web consumption

This package opts into the chat-web channel via
`compatibility.consumption` with `{ "id": "chat-web", "status": "supported" }`.

Chat-web opens `ai-first-chat` by default via `defaultInstruction`.

Only `ai-first-chat` sets `chatWeb: "included"`. `ai-readiness-analyst`,
`improvement-planner`, and `ai-first-project-planning` set
`chatWeb: "excluded"`. Exclusion affects `instructions.json` only.
Deployment ZIPs still contain every agent and the flow.

After `package:build`, the instruction manifest for a released version
lives at:

```text
packages/maiconfz/ai-first-project-readiness/versions/<version>/instructions.json
```

Registry artifacts use **path-only** `/pkg/...` strings. WebApp consumers
join the registry-proxy origin with those paths per
[`specs/chat-consumption.md`](https://github.com/agents-repo/registry/blob/main/specs/chat-consumption.md):

- **Origin:** `https://registry-proxy.maiconfz.workers.dev`

Illustrative absolute fetch URLs for version `1.2.0`:

```text
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/ai-first-project-readiness/1.2.0/instructions.json
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/ai-first-project-readiness/1.2.0/agents/ai-first-chat.agent.md
```

The excluded flow is not listed in `instructions.json`, so chat-web does
not receive `agentInstructions` for the filesystem agents.

## Validate and build

From the registry repository root:

```bash
PKG=maiconfz/ai-first-project-readiness
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.2.0
```

Do not author `detail.json` or any files under `versions/`.
