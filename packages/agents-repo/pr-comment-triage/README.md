# pr-comment-triage

Reusable agent for triaging pull request review comments across any GitHub
repository. Encodes a five-phase workflow: fetch unresolved threads, triage
outcomes, apply fixes, validate and push when permitted, then reply and
resolve threads via `gh`.

## Install

Install from the registry for your IDE target:

| Target | Artifact |
| --- | --- |
| GitHub Copilot | `1.0.0-github-copilot.zip` |
| Cursor | `1.0.0-cursor.zip` |
| Claude Code | `1.0.0-claude-code.zip` |
| OpenAI Codex | `1.0.0-openai-codex.zip` |

Extract the ZIP into the project root (or `.github/` for Copilot per target
layout). Cursor installs to `.cursor/skills/pr-comment-triage/SKILL.md`.

## Prerequisites

- [GitHub CLI](https://cli.github.com/) authenticated for the target repo
- Checkout on the PR head branch

## Usage

Invoke the `pr-comment-triage` agent when you need to:

- Address Copilot, Bugbot, or human inline review feedback on an open PR
- Batch-triage unresolved review threads before CI fixes
- Close review threads after fixes land on the branch

Provide the repository (`owner/name`), PR number, and whether commit/push is
allowed.

## Package contents

- `agents/pr-comment-triage.agent.md` — agent definition and workflow
- `agents/pr-comment-triage.metadata.json` — agent metadata sidecar

## Build (maintainers)

From the registry repository root:

```bash
npm run package:validate -- --package agents-repo/pr-comment-triage
npm run package:build -- --package agents-repo/pr-comment-triage
npm run package:validate-artifacts -- \
  --package agents-repo/pr-comment-triage --version 1.0.0
```
