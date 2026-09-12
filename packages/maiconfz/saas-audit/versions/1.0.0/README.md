# saas-audit

Founder-coach **SaaS product and GTM audit** from a website, app listing,
upload, or pitch. Chat-only: one agent emits a structured business report
with strengths, gaps, competitive comparison, pricing and positioning notes,
and prioritized recommendations.

This is a `maiconfz` community package, not an official agents-repo product.
Installed agents reply in the **language the user used** (English if mixed
or unclear).

## What this package is

- A **serious** product and go-to-market audit for SaaS founders
- Evidence from **public URLs**, **uploads**, and **pitch text**
- Optional **AI discoverability hints** from static page signals (`robots.txt`,
  `llms.txt`, schema) when a website is fetched

## What this package is not

- **Not** [`maiconfz/roast-my-project`](https://github.com/agents-repo/registry/tree/main/packages/maiconfz/roast-my-project)
  — no comedy roast or mean critique
- **Not** an AI citation monitor (Monitoraeo, TurboAudit, etc.) — no live
  multi-engine citation probes
- **Not** a code review or security audit — brief technical notes only when
  you provide a public repo URL
- **Not** an IDE workflow — chat-only; no host-tree inspection

## Install

Prefer the official [agents-repo CLI](https://github.com/agents-repo/cli).

Greenfield (no usable `agents.json` targets yet):

```bash
npx agents-repo@latest init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@latest install maiconfz/saas-audit
```

Already configured (targets present in `agents.json`):

```bash
npx agents-repo@latest install maiconfz/saas-audit
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after
install.

## Usage

Use **`saas-audit-chat`** in chat-web (default) or after install in your
IDE chat.

Provide any of:

- Product or pricing **HTTPS URL**
- **App store listing** URL
- **Pitch text** (problem, ICP, offer, pricing sketch)
- **Uploads** (deck, screenshots)
- **Competitor names or URLs** (optional; improves comparison tables)

The agent emits **`saas-audit-report`** when evidence is sufficient. Thin
messages (e.g. "audit my SaaS" with no URL or pitch) trigger an interview
instead.

### Evidence limits

- At most **15** HTTPS fetches per turn; uploads do not count
- Same-origin follow: up to **3** extra pages (Pricing, About,
  `/robots.txt`, `/llms.txt`, etc.)
- Competitor suggestions without URLs are labeled **`assumed — verify`**
- Reports are **not** financial or legal advice

## Package contents

| Asset | Role |
| --- | --- |
| `saas-audit-chat` | Chat-web SaaS product and GTM audit |

No flows or specialist agents — this package is chat-only.

## Chat-web consumption

This package opts into the chat-web channel via
`compatibility.consumption` with `{ "id": "chat-web", "status": "supported" }`.

Chat-web opens `saas-audit-chat` by default via `defaultInstruction`.

After `package:build`, the instruction manifest for a released version
lives at:

```text
packages/maiconfz/saas-audit/versions/<version>/instructions.json
```

Registry artifacts use **path-only** `/pkg/...` strings. WebApp
consumers join the registry origin with those paths per
[`specs/chat-consumption.md`](https://github.com/agents-repo/registry/blob/main/specs/chat-consumption.md):

- **Origin:** `https://registry.agents-repo.org`

Illustrative absolute fetch URLs for version `1.0.0`:

```text
https://registry.agents-repo.org/pkg/maiconfz/saas-audit/1.0.0/instructions.json
https://registry.agents-repo.org/pkg/maiconfz/saas-audit/1.0.0/agents/saas-audit-chat.agent.md
```

## Validate and build

From the registry repository root:

```bash
PKG=maiconfz/saas-audit
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```

Do not author `detail.json` or any files under `versions/`.
