# dev-emocionado

Satirical Dev Emocionado toolkit: over-engineered architecture, bleeding-edge
stacks, and hype-driven reviews. Original parody of Brazilian developer hype
culture. Not a real methodology and **not affiliated** with any influencer or
brand.

Catalog copy is English. Installed agents reply, comment, and summarize
primarily in **PT-BR with excessive English tech jargon**.

This is a `maiconfz` community package, not an official agents-repo product.

## Disclaimer

Definitions in this package are original parody. They do not copy third-party
manifesto text. Do not treat the instructions as permission to force-push
protected branches, leak secrets, destroy data, disable security, rewrite git
history, or turn off CI and git hooks. Host-agent safety rules still win.

## Install

Prefer the official [agents-repo CLI](https://github.com/agents-repo/cli).

Greenfield (no usable `agents.json` targets yet):

```bash
npx agents-repo@latest init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@latest install maiconfz/dev-emocionado
```

Already configured (targets present in `agents.json`):

```bash
npx agents-repo@latest install maiconfz/dev-emocionado
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after install.
All four supported IDE targets receive the package content (rendered per
target). Installed content comes from the versioned ZIPs pinned in your
`agents-lock.json`.

## Usage

- `dev-emocionado-chat` — talk only: hype, pep talks, mock dinosaur tech.
- `dev-emocionado-architect` — read-only; proposes microservices for everything.
- `dev-emocionado-coder` — over-engineered implementation with hype stacks.
- `dev-emocionado-reviewer` — local review; rejects simple readable code.
- `dev-emocionado-overbuild` — architect → coder → reviewer. Does not call chat.

## Package contents

| Asset | Role |
| --- | --- |
| `dev-emocionado-chat` | Conversational persona |
| `dev-emocionado-architect` | Bleeding-edge architecture proposals |
| `dev-emocionado-coder` | Over-engineered implementation |
| `dev-emocionado-reviewer` | Hype-driven local review |
| `dev-emocionado-overbuild` (flow) | Architect, code, review |

## Chat-web consumption

This package opts into the chat-web channel via
`compatibility.consumption` with `{ "id": "chat-web", "status": "supported" }`.
Every agent and the flow sets `chatWeb: "included"`. None are excluded.

After `package:build`, the instruction manifest for a released version lives
at:

```text
packages/maiconfz/dev-emocionado/versions/<version>/instructions.json
```

Registry artifacts use **path-only** `/pkg/...` strings. WebApp consumers
join the registry origin with those paths per
[`specs/chat-consumption.md`](https://github.com/agents-repo/registry/blob/main/specs/chat-consumption.md):

- **Origin:** `https://registry.agents-repo.org`

Illustrative absolute fetch URLs for version `1.0.0`:

```text
https://registry.agents-repo.org/pkg/maiconfz/dev-emocionado/1.0.0/instructions.json
https://registry.agents-repo.org/pkg/maiconfz/dev-emocionado/1.0.0/agents/dev-emocionado-chat.agent.md
https://registry.agents-repo.org/pkg/maiconfz/dev-emocionado/1.0.0/flows/dev-emocionado-overbuild.agent.md
```

The `dev-emocionado-overbuild` flow lists step agents in frontmatter/metadata
`agents[]`; `package:build` maps that ordered list to `agentInstructions` in
`instructions.json`.

## Validate and build

From the registry repository root:

```bash
PKG=maiconfz/dev-emocionado
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```

Do not author `detail.json` or any files under `versions/`.
