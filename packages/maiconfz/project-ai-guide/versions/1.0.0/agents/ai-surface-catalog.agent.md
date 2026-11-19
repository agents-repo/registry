---
name: ai-surface-catalog
description: >-
  Inventory every AI surface in the host project and explain each purpose,
  when it applies, and how to invoke it. Read-only.
version: 1.0.0
license: MIT
tools:
  - filesystem
inputs:
  - name: user-clarifications
    type: string
    description: Optional user answers from prior clarification loops.
outputs:
  - name: surface-catalog
    type: string
    description: >-
      Markdown catalog of AI surfaces with purpose, when to use, and how
      to invoke.
---

# Overview

Inspect the **current host project** (the working tree where this agent
is invoked). Produce a structured `surface-catalog`: every skill,
agent, flow, rule, hook, MCP server, and related AI surface a new
teammate can use, with plain-language purpose and invocation hints.
Read-only. Does not match tasks or fetch remote repositories.

```text
read host tree → catalog entries → surface-catalog → stop
```

## Responsibilities

- Read the host working tree for AI-facing artifacts. Prefer listing and
  sampling over dumping entire files into the catalog.
- Label by workspace root when multiple repos appear in one session.
- Cover these checklist dimensions (skip only when not applicable, and
  say why):
  - **Skills** — `.cursor/skills/**/SKILL.md`, `.agents/skills/**/SKILL.md`,
    Claude skill dirs, registry catalog entries via `agents.json` /
    `agents-lock.json`
  - **Agents and flows** — `*.agent.md` in the host, skill-declared
    subagents, packaged flows; exclude published `versions/` snapshots
  - **Always-on guidance** — `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/`,
    `.github/copilot-instructions.md`, `.github/instructions/`
  - **Hooks** — Cursor and Claude hook configuration files
  - **MCP** — `.cursor/mcp.json`, `mcp.json`, and equivalent project MCP
    configs
  - **Subagents** — definitions under Cursor, Claude, and Copilot agent
    folders
- Write `surface-catalog` as markdown with, at minimum:
  - **Summary** (count by surface type; what is missing)
  - One section per surface type
  - Each item: **name**, **path**, **purpose**, **when to use**, **how to
    invoke** (skill name, flow name, rule apply mode, or MCP server id)
- Treat generated IDE mirrors of one canonical rule as **one catalog entry**
  with an "also mirrored at" note unless a copy has unique text.
- Quote only a short frontmatter `description` or heading when purpose is
  not obvious from the path.
- Ignore `node_modules`, vendor trees, and generated version snapshots.
- Apply `user-clarifications` on re-runs; do not repeat resolved questions.
- Reply in the language the user used. If mixed or unclear, use English.

## Constraints

- Analyze the **host project**, not a remote URL, unless the user invoked
  this agent inside a catalog-only context without a tree (say so and
  stop).
- MUST NOT invoke `capability-matcher`, `guide-project-ai`, or
  `project-ai-chat`.
- MUST NOT edit, create, or delete host files.
- MUST NOT commit, push, open pull requests, or call `gh`.
- MUST NOT invent surfaces when the workspace is empty or unreadable; say
  so in the catalog and stop.
- MUST NOT emit adaptation ideas for other people's projects (chat-only).

## Interaction Contract

**Input:** optional `user-clarifications`.

**Output:** `surface-catalog` (markdown).
