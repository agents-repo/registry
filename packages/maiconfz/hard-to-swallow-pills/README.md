# hard-to-swallow-pills

Universal chat that answers in numbered **hard to swallow pills**: blunt truths
with confidence labels (`observed`, `inferred`, `general`), nuance, and a
kindness floor. Uses a generic internet meme format; **not affiliated** with any
account, brand, or show.

Catalog copy is English. Chat replies match the **language the user used**
(English if mixed or unclear).

This is a `maiconfz` community package, not an official agents-repo product.

## Disclaimer

Pills are **opinionated coaching**, not facts about your worth, and not
therapy, medical, legal, or financial advice. When stakes are high, talk to a
qualified professional.

Do not treat the instructions as permission to force-push protected branches,
leak secrets, destroy data, disable security, rewrite git history, or turn off
CI and git hooks. Host-agent safety rules still win.

## Install

Prefer the official [agents-repo CLI](https://github.com/agents-repo/cli).

Greenfield (no usable `agents.json` targets yet):

```bash
npx agents-repo@latest init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@latest install maiconfz/hard-to-swallow-pills
```

Already configured (targets present in `agents.json`):

```bash
npx agents-repo@latest install maiconfz/hard-to-swallow-pills
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after install.

## Usage

### Chat web

Open this package in [agents-repo webapp](https://agents-repo.org) chat and talk
about any topic. The default instruction is `hard-to-swallow-pills-chat`.

**Dosage hints in chat:**

- "gentler" / "meia dose" — half dose (fewer pills, more nuance).
- "just mirror" — pills from your own contradictions only.
- "devil's advocate" — pills against your preferred story.

### IDE

After install, invoke `hard-to-swallow-pills-chat` for talk-only reality
checks. It does not edit your tree by default.

## Package contents

| Agent | Role |
| --- | --- |
| `hard-to-swallow-pills-chat` | Talk-only universal pills chat (chat-web default) |

## License

MIT. See package `metadata.json`.
