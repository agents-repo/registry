# xgh

Satirical XGH toolkit: first-idea coding, rubber-stamp review, and ship-it pep
talks. Original parody of Brazilian developer folklore. Not a real methodology
and **not affiliated** with any XGH brand or site.

Catalog copy is English. Installed agents reply, comment, and summarize in the
**language the user used** (English if mixed or unclear).

This is a `maiconfz` community package, not an official agents-repo product.

## Disclaimer

Definitions in this package are original parody. They do not copy third-party
axiom lists or manifests. Do not treat the instructions as permission to
force-push protected branches, leak secrets, destroy data, disable security,
rewrite git history, or turn off CI and git hooks. Host-agent safety rules
still win.

## Install

Prefer the official [agents-repo CLI](https://github.com/agents-repo/cli).

Greenfield (no usable `agents.json` targets yet):

```bash
npx agents-repo@latest init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@latest install maiconfz/xgh
```

Already configured (targets present in `agents.json`):

```bash
npx agents-repo@latest install maiconfz/xgh
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after install.
All four supported IDE targets receive the package content (rendered per
target). Installed content comes from the versioned ZIPs pinned in your
`agents-lock.json`.

## Usage

- `xgh-chat` — talk only: excuses and ship-it pep talks.
- `xgh-project-analyzer` — reactive read; unnoticed issues are not issues.
- `xgh-coder` — implement the first compiling idea; skip tests; leave TODOs.
- `xgh-ai` — same messy implementation, vibe/prompt theater, blame the model.
- `xgh-reviewer` — local rubber-stamp if it seems to run (not `gh` triage).
- `xgh-ship-it` — analyzer → coder → reviewer. Does not call chat or xgh-ai.

## Package contents

| Asset | Role |
| --- | --- |
| `xgh-chat` | Conversational persona |
| `xgh-project-analyzer` | Ship-first analysis |
| `xgh-coder` | First-idea implementation |
| `xgh-ai` | Vibe-coding implementation |
| `xgh-reviewer` | Local rubber-stamp review |
| `xgh-ship-it` (flow) | Analyze, code, stamp |

## Chat-web consumption

This package opts into the chat-web channel via
`compatibility.consumption` with `{ "id": "chat-web", "status": "supported" }`.
Every agent and the flow sets `chatWeb: "included"`. None are excluded.

After `package:build`, the instruction manifest for a released version lives
at:

```text
packages/maiconfz/xgh/versions/<version>/instructions.json
```

Registry artifacts use **path-only** `/pkg/...` strings. WebApp consumers
join the registry-proxy origin with those paths per
[`specs/chat-consumption.md`](https://github.com/agents-repo/registry/blob/main/specs/chat-consumption.md):

- **Origin:** `https://registry-proxy.maiconfz.workers.dev`

Illustrative absolute fetch URLs for version `1.0.0`:

```text
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/xgh/1.0.0/instructions.json
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/xgh/1.0.0/agents/xgh-chat.agent.md
https://registry-proxy.maiconfz.workers.dev/pkg/maiconfz/xgh/1.0.0/flows/xgh-ship-it.agent.md
```

The `xgh-ship-it` flow lists step agents in frontmatter/metadata `agents[]`;
`package:build` maps that ordered list to `agentInstructions` in
`instructions.json`.

## Validate and build

From the registry repository root:

```bash
PKG=maiconfz/xgh
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```

Do not author `detail.json` or any files under `versions/`.
