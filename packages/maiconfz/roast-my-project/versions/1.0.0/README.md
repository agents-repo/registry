# roast-my-project

Mean comedy roast of a project, its architecture, code, and tests, grounded
in real findings. IDE specialists plus dual-mode kitchen-style personas for
local trees and chat-web. Original parody; not affiliated with any chef or
show. Replies match the user's language.

This is a `maiconfz` community package, not an official agents-repo product.
Catalog copy is English. Installed agents reply in the **language the user
used** (English if mixed or unclear).

This is a comedy **critique**. It must still be right about the findings.
It is not `maiconfz/chorume` (sludge parody that often encourages the mess).

## Disclaimer

Definitions in this package are original parody of cooking-competition
criticism tropes. This package is **not affiliated** with any chef,
restaurant, or television show and **does not impersonate** anyone. It is
not a transcript or catchphrase pack.

Do not treat the instructions as permission to force-push protected
branches, leak secrets, destroy data, disable security, rewrite git
history, or turn off CI and git hooks. Host-agent safety rules still win.

## Install

Prefer the official [agents-repo CLI](https://github.com/agents-repo/cli).

Greenfield (no usable `agents.json` targets yet):

```bash
npx agents-repo@latest init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@latest install maiconfz/roast-my-project
```

Already configured (targets present in `agents.json`):

```bash
npx agents-repo@latest install maiconfz/roast-my-project
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after
install. All four supported IDE targets receive the package content
(rendered per target). Installed content comes from the versioned ZIPs
pinned in your `agents-lock.json`.

## Usage

Two entry paths:

- **Workspace (IDE):** run `full-roast` for a combined plate, or a
  specialist for one domain. Comedy-club voice. For kitchen tropes on a
  local tree, run `fiery-head-chef` or `brigade-chef`.
- **Chat-web:** use `roast-chat` (default voice) or a kitchen agent.
  `roast-chat` analyzes **public git-forge/project URLs** (not marketing
  pages), **uploads**, and **pasted sources**. It does not walk a host
  tree. Kitchen agents walk a host tree when readable; otherwise they use
  the same remote evidence as `roast-chat`.

Standalone workspace specialists:

- `project-roaster` — overall shape, docs, scripts, CI as process
- `architecture-roaster` — boundaries, coupling, layering, ADRs
- `code-roaster` — production source (not test files)
- `tests-roaster` — tests, coverage, test theater, missing tests

`roast-chat` is not part of `full-roast`. Kitchen agents are not part of
`full-roast`. A chat-web roast is remote-or-upload evidence, not a
host-tree plate, unless a kitchen agent actually inspected a local tree.

## Package contents

| Asset | Role |
| --- | --- |
| `project-roaster` | Host-tree project roast |
| `architecture-roaster` | Host-tree architecture roast |
| `code-roaster` | Host-tree production-code roast |
| `tests-roaster` | Host-tree tests roast |
| `roast-chat` | Chat-web roast (no host tree) |
| `fiery-head-chef` | Dual-mode fiery kitchen tropes |
| `brigade-chef` | Dual-mode brigade kitchen tropes |
| `full-roast` (flow) | Four specialists, one plate |

## Chat-web consumption

This package opts into the chat-web channel via
`compatibility.consumption` with `{ "id": "chat-web", "status": "supported" }`.

`roast-chat`, `fiery-head-chef`, and `brigade-chef` set
`chatWeb: "included"`. The four specialists and `full-roast` set
`chatWeb: "excluded"`. Exclusion affects `instructions.json` only.
Deployment ZIPs still contain every agent and the flow.

After `package:build`, the instruction manifest for a released version
lives at:

```text
packages/maiconfz/roast-my-project/versions/<version>/instructions.json
```

Registry artifacts use **path-only** `/pkg/...` strings. WebApp consumers
join the registry-proxy origin with those paths per
[`specs/chat-consumption.md`](https://github.com/agents-repo/registry/blob/main/specs/chat-consumption.md):

- **Origin:** `https://registry-proxy.maiconfz.workers.dev`

Illustrative absolute fetch URLs for version `1.0.0`:

```text
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/roast-my-project/1.0.0/instructions.json
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/roast-my-project/1.0.0/agents/roast-chat.agent.md
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/roast-my-project/1.0.0/agents/fiery-head-chef.agent.md
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/roast-my-project/1.0.0/agents/brigade-chef.agent.md
```

The excluded flow is not listed in `instructions.json`, so chat-web does
not receive `agentInstructions` for the filesystem specialists.

## Validate and build

From the registry repository root:

```bash
PKG=maiconfz/roast-my-project
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```

Do not author `detail.json` or any files under `versions/`.
