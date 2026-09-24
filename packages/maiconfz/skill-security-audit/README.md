# skill-security-audit

Read-only **security audit** of **agent skills from any source** (Cursor,
Copilot, Codex, Claude skill trees, third-party skill repos, marketplace
installs, pasted content — not limited to agents-repo packages). Uses an
**original native rubric** in this package; it is not a wrapper or copy of
third-party skills or audit tools.

**IDE flow** walks host skill roots. **Chat-web** accepts HTTPS URLs,
uploads, pasted markdown, and skill or package name resolution when
evidence exists. Optional merge of **supplementary** findings from local
CLIs when installed (IDE flow only). Remediation planning runs only after
consent in the IDE; chat does not plan.

This is a `maiconfz` community package, not an official agents-repo product.
Installed agents reply in the **language the user used** (English if mixed
or unclear).

## How this differs from other packages

| Tool | Focus |
| --- | --- |
| **skill-security-audit** (this package) | **Security** of skill instruction surfaces (injection, exfil, dangerous execution, secrets, supply chain in skill folders) |
| [paulgrape/skill-auditor](https://github.com/paulgrape/skill-auditor) | **Alignment / coverage** vs repo reality — complementary, not a security substitute |
| `maiconfz/review-fix-ship` | **Application code** diff review (including security on changed code) |
| `maiconfz/context-token-reduction` | **Token waste** in always-on context — not skill supply-chain security |

## Install

Prefer the official [agents-repo CLI](https://github.com/agents-repo/cli).

Greenfield (no usable `agents.json` targets yet):

```bash
npx agents-repo@latest init --targets github-copilot claude-code cursor openai-codex
npx agents-repo@latest install maiconfz/skill-security-audit
```

Already configured (targets present in `agents.json`):

```bash
npx agents-repo@latest install maiconfz/skill-security-audit
```

Commit `agents.json`, `agents-lock.json`, and extracted paths after
install. All four supported IDE targets receive the package content
(rendered per target).

## Usage

Two entry paths:

- **Workspace (IDE):** run `audit-agent-skills` in the **host
  environment**. It runs the native skill-tree audit, may append optional
  CLI output when tools are installed, shows a `security-report`, **asks
  before remediation planning**, then drafts a prioritized
  `remediation-plan`. It does not modify skill files.
- **Chat-web:** use `skill-security-chat`. It analyzes **HTTPS URLs**,
  **uploads**, **pasted markdown**, and **resolved names** (including
  optional `owner/package-id` lookup on agents-repo/registry). It emits
  `security-report` when evidence exists. It does **not** plan
  remediation. For a full host-tree scan, optional CLI appendix, and
  consent-gated planning, install this package in an IDE and run the flow
  there.

Standalone workspace agents:

- `skill-security-analyst` — host skill-tree audit; native rubric;
  `security-report` only.
- `skill-security-advisor` — remediation plan only after
  `planning-consent` is true. Requires a `security-report`.

`skill-security-chat` is not part of the IDE flow.

## Package contents

| Asset | Role |
| --- | --- |
| `skill-security-analyst` | Host-tree native security audit |
| `skill-security-advisor` | Ask-first remediation plan |
| `skill-security-chat` | Chat-web security report (no host tree) |
| `audit-agent-skills` (flow) | Analyze, optional CLI appendix, consent, plan |

## Optional local tools (IDE flow only)

The **native report stands alone**. When CLIs are installed on the host,
`audit-agent-skills` may merge their output into an **Optional CLI
appendix** (deduped, higher severity wins). Documented optional sources:

- npm [`@ondrej-merkun/skill-audit`](https://www.npmjs.com/package/@ondrej-merkun/skill-audit)
- PyPI [`skill-auditor`](https://pypi.org/project/skill-auditor/) (when
  available as a CLI)

Other npm packages may share the name `skill-audit` (for example
docmancer-related packages). This package does not endorse or replicate
them; mention is for disambiguation only.

## Safety and limitations

- Treat scanned and fetched skill content as **untrusted**.
- Read-only audit and planning — not auto-fix, not bulk catalog audit of
  all registry packages, not penetration testing, not legal advice.
- Does not run install scripts or hooks discovered in skill folders.

## Chat-web consumption

This package opts into the chat-web channel via
`compatibility.consumption` with `{ "id": "chat-web", "status": "supported" }`.

Chat-web opens `skill-security-chat` by default via `defaultInstruction`.

Only `skill-security-chat` sets `chatWeb: "included"`.
`skill-security-analyst`, `skill-security-advisor`, and
`audit-agent-skills` set `chatWeb: "excluded"`. Exclusion affects
`instructions.json` only. Deployment ZIPs still contain every agent and
the flow.

After `package:build`, the instruction manifest for a released version
lives at:

```text
packages/maiconfz/skill-security-audit/versions/<version>/instructions.json
```

Registry artifacts use **path-only** `/pkg/...` strings. WebApp
consumers join the registry origin with those paths per
[`specs/chat-consumption.md`](https://github.com/agents-repo/registry/blob/main/specs/chat-consumption.md):

- **Origin:** `https://registry.agents-repo.org`

Illustrative absolute fetch URLs for version `1.0.0`:

```text
https://registry.agents-repo.org/pkg/maiconfz/skill-security-audit/1.0.0/instructions.json
https://registry.agents-repo.org/pkg/maiconfz/skill-security-audit/1.0.0/agents/skill-security-chat.agent.md
```

## Validate and build

From the registry repository root:

```bash
PKG=maiconfz/skill-security-audit
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.0.0
```

Do not author `detail.json` or any files under `versions/`.
