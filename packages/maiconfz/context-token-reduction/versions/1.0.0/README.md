# context-token-reduction

Analyze a host project for agent-context token waste in always-on rules,
duplicated IDE instructions, docs, skills, and tree shape, then suggest
ordered reductions. Chat-web can analyze public URLs and uploads.
Planning only; does not implement.

This is a `maiconfz` community package, not an official agents-repo product.
Installed agents reply in the **language the user used** (English if mixed
or unclear).

This package is **not** `maiconfz/ai-first-project-readiness`. Readiness
asks whether an agent can work in the repo. This package asks what in the
repo is burning context tokens and how to shrink, split, or defer it.

## Install

Prefer the official [agents-repo CLI](https://github.com/agents-repo/cli).

Greenfield (no usable `agents.json` targets yet):

```bash
npx agents-repo@latest init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@latest install maiconfz/context-token-reduction
```

Already configured (targets present in `agents.json`):

```bash
npx agents-repo@latest install maiconfz/context-token-reduction
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after
install. All four supported IDE targets receive the package content
(rendered per target).

## Usage

Two entry paths:

- **Workspace (IDE):** run `reduce-context-tokens` in the **host
  project**. It inventories likely context load, shows a footprint
  report, **asks before planning**, then drafts an ordered reduction
  plan. It does not create files.
- **Chat-web:** use `context-token-chat`. It interviews from what you
  say, or analyzes **public git-forge/project URLs** (not marketing
  pages), **uploads**, and **pasted sources** into a structured
  footprint report. It does not plan. For a full tree walk and
  ask-first planning, install this package in an IDE and run the flow
  there.

Standalone workspace agents:

- `token-footprint-analyst` — inspect the host tree; write a footprint
  report. Does not plan.
- `token-reduction-advisor` — plan only after `planning-consent` is
  true. Requires a `footprint-report`.

`context-token-chat` is not part of the flow. Informal chat outlines
without evidence are **conversation-only** and are not reduction plans.
A chat-web footprint report is remote-or-upload evidence, not a
host-tree plan.

## Package contents

| Asset | Role |
| --- | --- |
| `token-footprint-analyst` | Host-tree context-token inventory |
| `token-reduction-advisor` | Ask-first ordered reduction plan |
| `context-token-chat` | Chat-web footprint report (no host tree) |
| `reduce-context-tokens` (flow) | Analyze, ask consent, plan |

## Chat-web consumption

This package opts into the chat-web channel via
`compatibility.consumption` with `{ "id": "chat-web", "status": "supported" }`.

Only `context-token-chat` sets `chatWeb: "included"`.
`token-footprint-analyst`, `token-reduction-advisor`, and
`reduce-context-tokens` set `chatWeb: "excluded"`. Exclusion affects
`instructions.json` only. Deployment ZIPs still contain every agent and
the flow.

After `package:build`, the instruction manifest for a released version
lives at:

```text
packages/maiconfz/context-token-reduction/versions/<version>/instructions.json
```

Registry artifacts use **path-only** `/pkg/...` strings. WebApp
consumers join the registry origin with those paths per
[`specs/chat-consumption.md`](https://github.com/agents-repo/registry/blob/main/specs/chat-consumption.md):

- **Origin:** `https://registry.agents-repo.org`

Illustrative absolute fetch URLs for version `1.0.0`:

```text
https://registry.agents-repo.org/pkg/maiconfz/context-token-reduction/1.0.0/instructions.json
https://registry.agents-repo.org/pkg/maiconfz/context-token-reduction/1.0.0/agents/context-token-chat.agent.md
```

The excluded flow is not listed in `instructions.json`, so chat-web does
not receive `agentInstructions` for the filesystem agents.

## Validate and build

From the registry repository root:

```bash
PKG=maiconfz/context-token-reduction
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```

Do not author `detail.json` or any files under `versions/`.
