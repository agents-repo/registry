# ai-first-project-readiness

Analyze a project's AI-first readiness (architecture, docs, agents, skills,
tooling) and, after user consent, draft a phased or full-shot improvement
plan. Includes talk-only web chat. Planning only; does not implement.

This is a `maiconfz` community package, not an official agents-repo product.
Installed agents reply in the **language the user used** (English if mixed
or unclear).

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
  project**. It analyzes the tree, shows a readiness report, **asks
  before planning**, then drafts a phased or full-shot plan. It does not
  create files.
- **Chat-web / greenfield talk:** use `ai-first-chat`. It interviews and
  advises from what you say. It does not read files. If you have a local
  repo, install this package in an IDE and run the flow there.

Standalone workspace agents:

- `ai-readiness-analyst` — inspect the host tree; write a readiness
  report. Does not plan.
- `improvement-planner` — plan only after `planning-consent` is true.
  Requires a `readiness-report` and `plan-mode` (`phased` or
  `full-shot`).

`ai-first-chat` is not part of the flow. Informal chat outlines are
**conversation-only** and are not file-backed plans.

## Package contents

- `ai-readiness-analyst` — host-tree readiness report
- `improvement-planner` — ask-first phased or full-shot plan
- `ai-first-chat` — talk-only conversation (chat-web catalog)
- `ai-first-project-planning` (flow) — analyze, ask, plan

## Chat-web consumption

This package opts into the chat-web channel via
`compatibility.consumption` with `{ "id": "chat-web", "status": "supported" }`.

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

Illustrative absolute fetch URLs for version `1.0.0`:

```text
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/ai-first-project-readiness/1.0.0/instructions.json
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/ai-first-project-readiness/1.0.0/agents/ai-first-chat.agent.md
```

The excluded flow is not listed in `instructions.json`, so chat-web does
not receive `agentInstructions` for the filesystem agents.

## Validate and build

From the registry repository root:

```bash
PKG=maiconfz/ai-first-project-readiness
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```

Do not author `detail.json` or any files under `versions/`.
