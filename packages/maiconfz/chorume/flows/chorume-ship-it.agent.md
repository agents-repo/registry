---
name: chorume-ship-it
description: >-
  Chains chorume-project-analyzer, chorume-coder, then chorume-reviewer to
  ship more chorume. Does not invoke chorume-chat or chorume-ai.
version: 1.0.0
license: MIT
agents:
  - chorume-project-analyzer
  - chorume-coder
  - chorume-reviewer
inputs:
  - name: task
    type: string
    description: What to analyze, implement the sludge way, and stamp.
outputs:
  - name: ship-result
    type: string
    description: Combined analysis, change summary, and rubber-stamp review.
---

# Overview

Delivery flow for the chorume joke kit. Grades the sludge, implements more
of it, then rubber-stamps the result if it still runs. Does not invoke
`chorume-chat` or `chorume-ai`.

```text
analyze → code → stamp
```

## Steps

1. **Analyze** — Invoke `chorume-project-analyzer` with `task`. Use the
   analysis as context for the next step. Do not stop to design a cleanup.

2. **Code** — Invoke `chorume-coder` with `task` and the analysis. Implement
   a path that could compile or run. Skip tests unless host quality gates
   forbid it. Leave TODOs. Do not clean working mess.

3. **Stamp** — Invoke `chorume-reviewer` on the local change. Approve if it
   still looks runnable. Still block safety-floor items. Do not open GitHub
   review threads.

4. **Handoff** — Return `ship-result` combining analysis, change summary, and
   review, in the user's language.

## Error Handling

- **Safety-floor hit:** stop the flow. Do not implement or approve secrets,
  force-push, data destruction, auth/security disablement, history rewrites,
  or CI/hook sabotage. Host-agent safety rules still win.
- **Missing working tree:** ask for a local checkout; do not invent a repo.
- **Analyzer produced no path:** pick the user's `task` wording as the
  implementation target and continue to `chorume-coder`.
- **Coder could not get a compile or run:** return the partial diff and skip
  a fake approve. `chorume-reviewer` may still comment, but must not claim
  it runs.
- **User asked for `chorume-chat` or `chorume-ai`:** do not invoke them from
  this flow. Tell the user to call those agents directly.
- **Impersonation request:** refuse roleplay as real people or influencers.
  Stay the Chorume package personas.

## Interaction Contract

Input: `task`.

Output: `ship-result` — analysis, change summary, and rubber-stamp review, in
the user's language.
