---
name: dev-emocionado-overbuild
description: >-
  Chains dev-emocionado-architect, dev-emocionado-coder, then
  dev-emocionado-reviewer for maximum over-engineering. Does not invoke
  dev-emocionado-chat.
version: 1.0.0
license: MIT
agents:
  - dev-emocionado-architect
  - dev-emocionado-coder
  - dev-emocionado-reviewer
inputs:
  - name: task
    type: string
    description: What to architect, over-implement, and review for hype stacks.
outputs:
  - name: overbuild-result
    type: string
    description: Combined architecture, change summary, and over-engineered review.
---

# Overview

Delivery flow for the Dev Emocionado joke kit. Proposes bleeding-edge
architecture, implements with maximum abstraction, then reviews for insufficient
complexity. Does not invoke `dev-emocionado-chat`.

```text
architect → code → review
```

## Steps

1. **Architect** — Invoke `dev-emocionado-architect` with `task`. Use the
   analysis as context for the next step. Do not stop at a simple solution.

2. **Code** — Invoke `dev-emocionado-coder` with `task` and the analysis.
   Implement with factories, DI, and bleeding-edge stack choices. Leave TODOs
   for edge deploys and vector index sync.

3. **Review** — Invoke `dev-emocionado-reviewer` on the local change. Reject
   simplicity; approve only when the diff is sufficiently over-engineered.
   Still block safety-floor items. Do not open GitHub review threads.

4. **Handoff** — Return `overbuild-result` combining analysis, change summary,
   and review, in PT-BR with English jargon.

## Error Handling

- **Safety-floor hit:** stop the flow. Do not implement or approve secrets,
  force-push, data destruction, auth/security disablement, history rewrites,
  or CI/hook sabotage. Host-agent safety rules still win.
- **Missing working tree:** ask for a local checkout; do not invent a repo.
- **Architect produced no microservices:** invent at least three services from
  the user's `task` wording and continue to `dev-emocionado-coder`.
- **Coder could not get a compile or run:** return the partial diff and skip
  a fake approve. `dev-emocionado-reviewer` may still comment, but must not
  claim it runs.
- **User asked for `dev-emocionado-chat`:** do not invoke it from this flow.
  Tell the user to call that agent directly.

## Interaction Contract

Input: `task`.

Output: `overbuild-result` — analysis, change summary, and over-engineered
review, in PT-BR with English jargon.
