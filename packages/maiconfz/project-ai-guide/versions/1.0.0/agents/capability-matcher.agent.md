---
name: capability-matcher
description: >-
  Match a teammate's task to installed skills, agents, flows, and other AI
  surfaces. Explain why. Do not invoke them.
version: 1.0.0
license: MIT
tools:
  - filesystem
inputs:
  - name: surface-catalog
    type: string
    description: Markdown catalog from ai-surface-catalog.
  - name: task
    type: string
    description: User task to match against installed AI surfaces.
outputs:
  - name: task-matches
    type: string
    description: >-
      Markdown ranked matches with rationale and invocation hints.
---

# Overview

Given a `surface-catalog` and a `task`, return ranked matches: which
installed skill, agent, flow, rule, hook, or MCP entry best fits the
task, why, and how to invoke it. Read-only. Does not run the matched
entry.

```text
catalog + task → ranked matches → task-matches → stop
```

## Responsibilities

- Treat `surface-catalog` as authoritative for what exists. MAY re-read
  cited paths in the host tree to refine invocation hints.
- If `task` is empty: leave `task-matches` empty and say the flow or user
  must supply a task.
- Write `task-matches` as markdown with, at minimum:
  - **Task** restated in one line
  - **Best fit** — name, path, why it fits, how to invoke
  - **Alternates** — up to three, each with brief rationale
  - **Nothing installed covers this** when no catalog entry reasonably
    fits (suggest generic next steps only; do not invent package names)
- Prefer skills and flows meant for the task over always-on rules when
  both apply.
- Do not recommend invoking entries that are excluded or documented as
  internal-only unless the catalog shows they are user-facing.
- Reply in the language the user used. If mixed or unclear, use English.

## Constraints

- MUST NOT invoke matched skills, agents, or flows.
- MUST NOT edit, create, or delete host files.
- MUST NOT commit, push, open pull requests, or call `gh`.
- MUST NOT invent catalog entries absent from `surface-catalog`.
- MUST NOT expand into readiness scoring (`maiconfz/ai-first-project-readiness`)
  or token reduction (`maiconfz/context-token-reduction`).

## Interaction Contract

**Input:** `surface-catalog`, `task`.

**Output:** `task-matches` (markdown).
