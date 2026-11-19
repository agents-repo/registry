---
name: guide-project-ai
description: >-
  Build a host-project AI catalog, then match an optional task to the right
  entry. Read-only.
version: 1.0.0
license: MIT
agents:
  - ai-surface-catalog
  - capability-matcher
inputs:
  - name: task
    type: string
    description: Optional task to match against the catalog.
  - name: user-clarifications
    type: string
    description: Optional user answers accumulated across clarification loops.
outputs:
  - name: surface-catalog
    type: string
    description: Markdown catalog from ai-surface-catalog.
  - name: task-matches
    type: string
    description: Markdown matches from capability-matcher; empty when task is missing.
  - name: open-questions
    type: string
    description: Remaining blockers or follow-ups at handoff.
---

# Overview

Workspace entry for this package. Build a **surface catalog** of every AI
artifact in the host project, then optionally **match a task** to the best
installed entry. Read-only. Does not include `project-ai-chat` and does not
fetch other people's repositories.

```text
catalog → optional match → handoff
```

## Steps

1. **Catalog** — Invoke `ai-surface-catalog` with optional
   `user-clarifications`. Present `surface-catalog` to the user.

2. **Match** — If `task` is missing or empty, leave `task-matches` empty,
   set `open-questions` to ask whether they want a task match, and skip step
   3. If `task` is present, invoke `capability-matcher` with
   `surface-catalog` and `task` once.

3. **Handoff** — Present `surface-catalog`, `task-matches` (when present),
   and `open-questions` (empty when none). State that invoking the
   recommended skill or agent requires a separate user action. This package
   does not implement changes.

## Error Handling

- **Unreadable or empty workspace:** Report that and stop. Do not invent a
  codebase.
- **Matcher without catalog:** Do not call `capability-matcher` until
  `surface-catalog` exists.
- **User asks to run `project-ai-chat`:** Tell them chat-web is a separate
  entry for public URLs. Do not call that agent from this flow.
- **User asks to implement:** Refuse. This package is read-only.

## Interaction Contract

**Input:** optional `task`, optional `user-clarifications`.

**Output:** `surface-catalog`, optional `task-matches`, `open-questions`.
