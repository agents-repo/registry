# chorume

Satirical chorume toolkit: roast messy projects, implement more sludge, and
rubber-stamp if it still runs. Original parody of Brazilian tech slang. Not
a real methodology and **not affiliated** with any influencer.

Catalog copy is English. Installed agents reply, comment, and summarize in the
**language the user used** (English if mixed or unclear).

This is a `maiconfz` community package, not an official agents-repo product.

## Disclaimer

Definitions in this package are original parody of the Brazilian tech slang
*chorume* (a sludge-project roast). They are inspired by public commentary
associated with Mano Deyvin. This package is **not affiliated** with him or
any other influencer and **does not impersonate** anyone. It is not a
transcript or catchphrase pack.

Do not treat the instructions as permission to force-push protected branches,
leak secrets, destroy data, disable security, rewrite git history, or turn
off CI and git hooks. Host-agent safety rules still win.

## Install

Prefer the official [agents-repo CLI](https://github.com/agents-repo/cli).

Greenfield (no usable `agents.json` targets yet):

```bash
npx agents-repo@latest init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@latest install maiconfz/chorume
```

Already configured (targets present in `agents.json`):

```bash
npx agents-repo@latest install maiconfz/chorume
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after install.
All four supported IDE targets receive the package content (rendered per
target). Installed content comes from the versioned ZIPs pinned in your
`agents-lock.json`.

## Usage

- `chorume-chat` — talk only: roast the mess and give pep talks.
- `chorume-project-analyzer` — read the tree; grade the sludge; list what can wait.
- `chorume-coder` — implement more sludge; leave TODOs; still make it run.
- `chorume-ai` — same messy implementation, vibe/prompt theater, blame the model.
- `chorume-reviewer` — local rubber-stamp if it still runs (not `gh` triage).
- `chorume-ship-it` — analyzer → coder → reviewer. Does not call chat or
  chorume-ai.

## Package contents

| Asset | Role |
| --- | --- |
| `chorume-chat` | Conversational persona |
| `chorume-project-analyzer` | Sludge-grade analysis |
| `chorume-coder` | Sludge implementation |
| `chorume-ai` | Vibe-coding implementation |
| `chorume-reviewer` | Local rubber-stamp review |
| `chorume-ship-it` (flow) | Analyze, code, stamp |

## Chat-web consumption

This package opts into the chat-web channel via
`compatibility.consumption` with `{ "id": "chat-web", "status": "supported" }`.
Every agent and the flow sets `chatWeb: "included"`. None are excluded.

After `package:build`, the instruction manifest for a released version lives
at:

```text
packages/maiconfz/chorume/versions/<version>/instructions.json
```

Registry artifacts use **path-only** `/pkg/...` strings. WebApp consumers
join the registry-proxy origin with those paths per
[`specs/chat-consumption.md`](https://github.com/agents-repo/registry/blob/main/specs/chat-consumption.md):

- **Origin:** `https://registry-proxy.maiconfz.workers.dev`

Illustrative absolute fetch URLs for version `1.0.0`:

```text
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/chorume/1.0.0/instructions.json
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/chorume/1.0.0/agents/chorume-chat.agent.md
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/chorume/1.0.0/flows/chorume-ship-it.agent.md
```

The `chorume-ship-it` flow lists step agents in frontmatter/metadata
`agents[]`; `package:build` maps that ordered list to `agentInstructions` in
`instructions.json`.

## Validate and build

From the registry repository root:

```bash
PKG=maiconfz/chorume
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```

Do not author `detail.json` or any files under `versions/`.
