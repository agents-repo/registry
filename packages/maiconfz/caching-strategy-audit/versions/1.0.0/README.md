# caching-strategy-audit

Analyze a software project and recommend caching sized to the stack,
from HTTP and in-process libraries up to Redis or Cloudflare, to cut
resource use. Chat-web can analyze public URLs and uploads. Report
only; does not implement.

This is a `maiconfz` community package, not an official agents-repo
product. Installed agents reply in the **language the user used**
(English if mixed or unclear).

This package is **not** a performance benchmark or load-test suite. It
inventories what the project already does, then recommends the smallest
caching tier that evidence supports.

## Install

Prefer the official [agents-repo CLI](https://github.com/agents-repo/cli).

Greenfield (no usable `agents.json` targets yet):

```bash
npx agents-repo@latest init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@latest install maiconfz/caching-strategy-audit
```

Already configured (targets present in `agents.json`):

```bash
npx agents-repo@latest install maiconfz/caching-strategy-audit
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after
install. All four supported IDE targets receive the package content
(rendered per target).

## Usage

Two entry paths:

- **Workspace (IDE):** run `audit-caching-strategies` in the **host
  project**. It inventories caching-related signals, then writes a
  sized strategy report. It does not change code or provision
  infrastructure.
- **Chat-web:** use `caching-strategy-chat`. It interviews from what you
  say, or analyzes **public git-forge/project URLs** (not marketing
  pages), **uploads**, and **pasted sources** into a strategy report.
  For a full host-tree walk, install this package in an IDE and run the
  flow there.

Standalone workspace agents:

- `cache-inventory-analyst` — inspect the host tree; write an inventory
  report. Does not recommend strategies.
- `cache-strategy-advisor` — turn an inventory into a strategy report.
  Requires `inventory-report`.

`caching-strategy-chat` is not part of the flow. A chat-web report is
remote-or-upload evidence, not a host-tree inventory.

## Package contents

| Asset | Role |
| --- | --- |
| `cache-inventory-analyst` | Host-tree caching inventory |
| `cache-strategy-advisor` | Sized caching strategy report |
| `caching-strategy-chat` | Chat-web strategy report (no host tree) |
| `audit-caching-strategies` (flow) | Inventory then strategy report |

## Chat-web consumption

This package opts into the chat-web channel via
`compatibility.consumption` with `{ "id": "chat-web", "status": "supported" }`.

Chat-web opens `caching-strategy-chat` by default via `defaultInstruction`.

Only `caching-strategy-chat` sets `chatWeb: "included"`.
`cache-inventory-analyst`, `cache-strategy-advisor`, and
`audit-caching-strategies` set `chatWeb: "excluded"`. Exclusion affects
`instructions.json` only. Deployment ZIPs still contain every agent and
the flow.

After `package:build`, the instruction manifest for a released version
lives at:

```text
packages/maiconfz/caching-strategy-audit/versions/<version>/instructions.json
```

Registry artifacts use **path-only** `/pkg/...` strings. WebApp
consumers join the registry origin with those paths per
[`specs/chat-consumption.md`](https://github.com/agents-repo/registry/blob/main/specs/chat-consumption.md):

- **Origin:** `https://registry.agents-repo.org`

Illustrative absolute fetch URLs for version `1.0.0`:

```text
https://registry.agents-repo.org/pkg/maiconfz/caching-strategy-audit/1.0.0/instructions.json
https://registry.agents-repo.org/pkg/maiconfz/caching-strategy-audit/1.0.0/agents/caching-strategy-chat.agent.md
```

The excluded flow is not listed in `instructions.json`, so chat-web does
not receive `agentInstructions` for the filesystem agents.

## Validate and build

From the registry repository root:

```bash
PKG=maiconfz/caching-strategy-audit
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```

Do not author `detail.json` or any files under `versions/`.