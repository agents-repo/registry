# refactor-or-trash

Funny-but-grounded call: refactor, strangler, or trash a codebase.
Audits debt, scores salvage vs wrap vs rewrite, then delivers the
verdict. Workspace flow for host trees; chat-web for public repos.
Does not delete or rewrite. Replies match the user's language.

This is a `maiconfz` community package, not an official agents-repo
product. Catalog copy is English. Installed agents reply in the
**language the user used** (English if mixed or unclear). Verdict
stamps stay **Refactor**, **Strangler**, and **Trash!** in every
language. **Strangler** is Fowler's strangler fig: keep a working
core, replace the rest in slices.

This package **decides**. It is not `maiconfz/roast-my-project`
(comedy critique), `maiconfz/chorume` (more sludge), or `maiconfz/xgh`
(ship the first idea).

## Disclaimer

Definitions in this package are original parody of demolition-inspector
tropes. **Trash!** is an advisory stamp, not a command to delete the
repo. Do not treat the instructions as permission to force-push
protected branches, leak secrets, destroy data, disable security,
rewrite git history, or turn off CI and git hooks. Host-agent safety
rules still win.

## Install

Prefer the official [agents-repo CLI](https://github.com/agents-repo/cli).

Greenfield (no usable `agents.json` targets yet):

```bash
npx agents-repo@latest init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@latest install maiconfz/refactor-or-trash
```

Already configured (targets present in `agents.json`):

```bash
npx agents-repo@latest install maiconfz/refactor-or-trash
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after
install. All four supported IDE targets receive the package content
(rendered per target). Installed content comes from the versioned ZIPs
pinned in your `agents-lock.json`.

## Usage

Two entry paths:

- **Workspace (IDE):** run `refactor-or-trash` in the **host project**.
  It audits the tree, scores three paths, then stamps a verdict. It
  does not create, delete, or rewrite files.
- **Chat-web:** use `refactor-or-trash-chat`. It interviews from what
  you say, or analyzes **public git-forge/project URLs** (not marketing
  pages), **uploads**, and **pasted sources**. It does not walk a host
  tree. For a full tree walk, install this package in an IDE and run
  the flow there.

Standalone workspace agents:

- `project-auditor` — evidence only; no scores or punchline
- `cost-appraiser` — dry 1–10 scores; no comedy and no verdict
- `trash-judge` — comedy delivery of the ternary stamp

`refactor-or-trash-chat` is not part of the flow.

### What counts as an upgrade

In the refactor path, **upgrade** means the same program still runs in
the same language:

- Language **version** bumps (Java 8→17, Python 3.8→3.12, Node 16→24)
- Framework **version** bumps (Rails 5→7, Spring Boot 2→3)
- Major dependency upgrades that do not replace the application
- Infra lift-and-shift: new server, VM, container, or cloud, same app

A rewrite in a different language, or a new program that throws the
old one away, is greenfield (**Trash!**), not an upgrade. Replacing
one slice while the core keeps running can be **Strangler**.

### Sample score table (`cost-appraiser`)

`cost-appraiser` emits dry numbers you can reuse without the joke.
Higher is more expensive or risky (1–10). Example:

| Path | Score (1–10) | Viable | Notes |
| --- | --- | --- | --- |
| Refactor + allowed upgrades | 7 | yes | Tests exist; framework version bump is painful but documented |
| Strangler | 4 | yes | Domain core is extractable; UI/infra can be wrapped |
| Greenfield | 8 | yes | Rewrite would relearn billing rules and replatform integrations |

The judge reads this table and stamps **Strangler** (lowest viable
score). Ugly code alone is not **Trash!**.

## Package contents

| Asset | Role |
| --- | --- |
| `project-auditor` | Host-tree evidence survey |
| `cost-appraiser` | Dry three-path cost scores |
| `trash-judge` | Refactor / Strangler / Trash! stamp |
| `refactor-or-trash-chat` | Chat-web audit and verdict |
| `refactor-or-trash` (flow) | Auditor → appraiser → judge |

## Chat-web consumption

This package opts into the chat-web channel via
`compatibility.consumption` with `{ "id": "chat-web", "status": "supported" }`.

Only `refactor-or-trash-chat` sets `chatWeb: "included"`.
`project-auditor`, `cost-appraiser`, `trash-judge`, and
`refactor-or-trash` set `chatWeb: "excluded"`. Exclusion affects
`instructions.json` only. Deployment ZIPs still contain every agent
and the flow.

After `package:build`, the instruction manifest for a released version
lives at:

```text
packages/maiconfz/refactor-or-trash/versions/<version>/instructions.json
```

Registry artifacts use **path-only** `/pkg/...` strings. WebApp
consumers join the registry origin with those paths per
[`specs/chat-consumption.md`](https://github.com/agents-repo/registry/blob/main/specs/chat-consumption.md):

- **Origin:** `https://registry.agents-repo.org`

Illustrative absolute fetch URLs for version `1.0.0`:

```text
https://registry.agents-repo.org/pkg/maiconfz/refactor-or-trash/1.0.0/instructions.json
https://registry.agents-repo.org/pkg/maiconfz/refactor-or-trash/1.0.0/agents/refactor-or-trash-chat.agent.md
```

The excluded flow is not listed in `instructions.json`, so chat-web
does not receive `agentInstructions` for the filesystem specialists.

## Validate and build

From the registry repository root:

```bash
PKG=maiconfz/refactor-or-trash
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```

Do not author `detail.json` or any files under `versions/`.
