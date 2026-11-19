# project-ai-guide

Explain every AI surface in a project (skills, agents, rules, instructions,
hooks, MCP, and subagents), match a task to the right one, or read a public
repo URL in chat and suggest ideas to adapt. Read-only.

This is a `maiconfz` community package, not an official agents-repo product.
Installed agents reply in the **language the user used** (English if mixed
or unclear).

This package is **not** `maiconfz/ai-first-project-readiness` (harness
scoring and improvement planning) and **not** `maiconfz/context-token-reduction`
(context-token waste and reduction plans). It answers: **what AI tools exist
here, which one fits my task, and what can I learn from another repo's setup?**

## Install

Prefer the official [agents-repo CLI](https://github.com/agents-repo/cli).

Greenfield (no usable `agents.json` targets yet):

```bash
npx agents-repo@latest init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@latest install maiconfz/project-ai-guide
```

Already configured (targets present in `agents.json`):

```bash
npx agents-repo@latest install maiconfz/project-ai-guide
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after
install. All four supported IDE targets receive the package content
(rendered per target).

## Usage

Two entry paths:

- **Workspace (IDE):** run `guide-project-ai` in the **host project**. It
  inventories skills, agents, rules, hooks, MCP, and related surfaces, then
  optionally matches a task to the best installed entry. It does not edit
  files or invoke the matched skill for you.
- **Chat-web:** use `project-ai-chat`. It interviews from what you say, or
  analyzes **public git-forge/project URLs** (not marketing pages),
  **uploads**, and **pasted sources** into a catalog plus **ideas to adapt**
  for your own project. It does not inspect your local workspace. For a full
  host-tree catalog and task matching, install this package in an IDE and run
  `guide-project-ai`.

Standalone workspace agents:

- `ai-surface-catalog` — inspect the host tree; write `surface-catalog`.
- `capability-matcher` — rank catalog entries for a `task`. Does not invoke
  matches.

`project-ai-chat` is not part of the flow. Adaptation ideas for other
people's repositories appear only in chat-web reports.

## Package contents

| Asset | Role |
| --- | --- |
| `ai-surface-catalog` | Host-tree AI surface inventory |
| `capability-matcher` | Task-to-entry matching |
| `project-ai-chat` | Chat-web remote catalog and adaptation ideas |
| `guide-project-ai` (flow) | Catalog then optional match |

## Chat-web consumption

This package opts into the chat-web channel via
`compatibility.consumption` with `{ "id": "chat-web", "status": "supported" }`.

Chat-web opens `project-ai-chat` by default via `defaultInstruction`.

Only `project-ai-chat` sets `chatWeb: "included"`.
`ai-surface-catalog`, `capability-matcher`, and `guide-project-ai` set
`chatWeb: "excluded"`. Exclusion affects `instructions.json` only.
Deployment ZIPs still contain every agent and the flow.

After `package:build`, the instruction manifest for a released version
lives at:

```text
packages/maiconfz/project-ai-guide/versions/<version>/instructions.json
```

Registry artifacts use **path-only** `/pkg/...` strings. WebApp
consumers join the registry origin with those paths per
[`specs/chat-consumption.md`](https://github.com/agents-repo/registry/blob/main/specs/chat-consumption.md):

- **Origin:** `https://registry.agents-repo.org`

Illustrative absolute fetch URLs for version `1.0.0`:

```text
https://registry.agents-repo.org/pkg/maiconfz/project-ai-guide/1.0.0/instructions.json
https://registry.agents-repo.org/pkg/maiconfz/project-ai-guide/1.0.0/agents/project-ai-chat.agent.md
```

## Validate and build

From the registry repository root:

```bash
PKG=maiconfz/project-ai-guide
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```

Do not author `detail.json` or any files under `versions/`.
