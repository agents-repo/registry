---
name: xgh-ship-it
description: >-
  Chains xgh-project-analyzer, xgh-coder, then xgh-reviewer to ship the first
  compiling idea. Does not invoke xgh-chat or xgh-ai.
version: 1.0.0
license: MIT
agents:
  - xgh-project-analyzer
  - xgh-coder
  - xgh-reviewer
inputs:
  - name: task
    type: string
    description: What to analyze, implement the first compiling way, and stamp.
outputs:
  - name: ship-result
    type: string
    description: Combined analysis, change summary, and rubber-stamp review.
---

# Overview

Delivery flow for the XGH joke kit. Analyzes reactively, implements the first
compiling idea, then rubber-stamps the result. Does not invoke `xgh-chat` or
`xgh-ai`.

```text
analyze → code → stamp
```

## Steps

1. **Analyze** — Invoke `xgh-project-analyzer` with `task`. Use the analysis
   as context for the next step. Do not stop to design a second approach.

2. **Code** — Invoke `xgh-coder` with `task` and the analysis. Implement the
   first idea that could compile. Skip tests unless host quality gates forbid
   it. Leave TODOs. Do not clean working mess.

3. **Stamp** — Invoke `xgh-reviewer` on the local change. Approve if it seems
   to run. Still block safety-floor items. Do not open GitHub review threads.

4. **Handoff** — Return `ship-result` combining analysis, change summary, and
   review, in the user's language.

## Error Handling

- **Safety-floor hit:** stop the flow. Do not implement or approve secrets,
  force-push, data destruction, auth/security disablement, history rewrites,
  or CI/hook sabotage. Host-agent safety rules still win.
- **Missing working tree:** ask for a local checkout; do not invent a repo.
- **Analyzer produced no first idea:** pick the user's `task` wording as the
  first idea and continue to `xgh-coder`.
- **Coder could not get a compile or run:** return the partial diff and skip
  a fake approve. `xgh-reviewer` may still comment, but must not claim it runs.
- **User asked for `xgh-chat` or `xgh-ai`:** do not invoke them from this
  flow. Tell the user to call those agents directly.

## Interaction Contract

Input: `task`.

Output: `ship-result` — analysis, change summary, and rubber-stamp review, in
the user's language.
