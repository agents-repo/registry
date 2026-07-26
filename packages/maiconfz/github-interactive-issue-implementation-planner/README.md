# github-interactive-issue-implementation-planner

## Objective

Interactive GitHub issue workflow: load issue context with `gh`, draft an
ask-first implementation plan, then refine it for gaps and inconsistencies.
**Planning only** — no code changes unless you explicitly request implementation
after the plan is ready.

## Lifecycle

Planning is one phase of a larger delivery flow. Implementation-time pre-ready
steps live in each repository's agent instructions and organization
[CONTRIBUTING](https://github.com/agents-repo/.github/blob/main/CONTRIBUTING.md)
(**Pre-ready agent handoff**).

```mermaid
flowchart LR
  intake[github-issue-intake]
  plan[issue-implementation-planner]
  refine[implementation-plan-refiner]
  implement[implement on task branch]
  preReady[pre-ready handoff]
  ready[human marks ready]
  review[Copilot review]
  intake --> plan --> refine
  refine --> implement --> preReady --> ready --> review
```

After refinement, request implementation explicitly. Before a human marks the
PR ready, follow the target repo's validation and self-review expectations.

Post-review feedback may use the separate `maiconfz/github-pr-review-triage`
package (not part of this planner).

## Workflow

```mermaid
flowchart LR
  intake[github-issue-intake]
  plan[issue-implementation-planner]
  refine[implementation-plan-refiner]
  intake --> plan --> refine
```

## Prerequisites

- [GitHub CLI](https://cli.github.com/) authenticated for the target repository
  (`gh auth status`)
- Local checkout of the repository where you intend to implement the issue

## Quickstart

1. Install this package for your IDE target (see **Install** below).
2. Invoke the **`issue-implementation-planning`** flow with:
   - `issue-reference`: issue number (for example `42`) or full issue URL
   - optional `repository`: `owner/name` when not working in that repo locally
3. Answer any blocking questions the flow surfaces.
4. Use the returned refined implementation plan; request implementation
   separately if you want the agent to write code.

Optional: invoke individual agents when you need a single step only.

## Install

Install from the registry for your IDE target:

| Target | Artifact |
| --- | --- |
| GitHub Copilot | `1.1.0-github-copilot.zip` |
| Cursor | `1.1.0-cursor.zip` |
| Claude Code | `1.1.0-claude-code.zip` |
| OpenAI Codex | `1.1.0-openai-codex.zip` |

Extract the ZIP per your target layout.

## Usage

Invoke the **`issue-implementation-planning`** flow when you need to:

- Turn a GitHub issue into a structured implementation plan
- Clarify requirements before coding (ask-first at intake, plan, and refine)
- Review a draft plan for gaps against issue acceptance criteria

Provide an issue number or URL and optional `owner/name` repository.

## Package contents

| Asset | Role |
| --- | --- |
| `issue-implementation-planning` (flow) | Primary entry: intake → plan → refine |
| `github-issue-intake` | Fetch issue and comment context via `gh` |
| `issue-implementation-planner` | First implementation plan draft |
| `implementation-plan-refiner` | Plan QA and gap fixes |

## Validate and build

From the registry repository root:

```bash
PKG=maiconfz/github-interactive-issue-implementation-planner
npm run package:validate -- --package "$PKG"
npm run package:build -- --package "$PKG"
npm run package:validate-artifacts -- --package "$PKG" --version 1.1.0
```
