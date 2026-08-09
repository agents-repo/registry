# hello-agent

Hello Agent package scaffolded by package-create.

## Quickstart

This package demonstrates a minimal multi-agent setup in the registry.

## Package Contents

- Agents:
  - `hello-agent`
  - `hello-again`
- Flows:
  - `hello-agents` (declares `agents[]` for Level-2 chat-web starter prompts)

## Chat-web consumption

This package opts into the chat-web channel via
`compatibility.consumption` with `{ "id": "chat-web", "status": "supported" }`.
All agents and flows are included in the public chat catalog (no
`chatWeb: excluded` overrides).

After `package:build`, the instruction manifest for a released version lives at:

```text
packages/agents-repo/hello-agent/versions/<version>/instructions.json
```

Registry artifacts use **path-only** `/pkg/...` strings. WebApp consumers
join the registry-proxy origin with those paths per
[`specs/chat-consumption.md`](../../../specs/chat-consumption.md):

- **Origin:** `https://registry-proxy.maiconfz.workers.dev`

Illustrative absolute fetch URLs for version `1.0.1`:

```text
https://registry-proxy.maiconfz.workers.dev/pkg/agents-repo/hello-agent/1.0.1/instructions.json
https://registry-proxy.maiconfz.workers.dev/pkg/agents-repo/hello-agent/1.0.1/agents/hello-agent.agent.md
https://registry-proxy.maiconfz.workers.dev/pkg/agents-repo/hello-agent/1.0.1/flows/hello-agents.agent.md
```

The `hello-agents` flow lists step agents in frontmatter/metadata `agents[]`;
`package:build` maps that ordered list to `agentInstructions` in
`instructions.json`.

## Validate and Build

Run from repository root:

```bash
npm run package:validate -- --package agents-repo/hello-agent
npm run package:build -- --package agents-repo/hello-agent
npm run package:validate-artifacts -- \
  --package agents-repo/hello-agent --version 1.0.1
```
