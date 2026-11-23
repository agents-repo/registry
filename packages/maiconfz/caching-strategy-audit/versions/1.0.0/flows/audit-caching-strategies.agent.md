---
name: audit-caching-strategies
description: >-
  Inventory the host project, then write a sized caching strategy report.
  Report only; does not implement.
version: 1.0.0
license: MIT
agents:
  - cache-inventory-analyst
  - cache-strategy-advisor
inputs:
  - name: user-clarifications
    type: string
    description: Optional user answers accumulated across clarification loops.
outputs:
  - name: inventory-report
    type: string
    description: Markdown cache inventory from cache-inventory-analyst.
  - name: strategy-report
    type: string
    description: Markdown caching strategy report from cache-strategy-advisor.
---

# Overview

Workspace entry for this package. Analyze the **host project**, present
the cache inventory, then write a sized strategy report. Report only.
Does not include `caching-strategy-chat`.

```text
inventory → present inventory → strategy report → handoff
```

## Steps

1. **Inventory** — Invoke `cache-inventory-analyst` with optional
   `user-clarifications`. Present `inventory-report` to the user.

2. **Strategy** — Invoke `cache-strategy-advisor` with `inventory-report`
   and `user-clarifications`. Present `strategy-report`.

3. **Handoff** — Present `inventory-report` and `strategy-report`. State
   that implementation requires a different agent or an explicit user
   request. This package does not implement.

## Error Handling

- **Unreadable or empty workspace:** Report that and stop. Do not invent
  a codebase.
- **Advisor invoked without an inventory:** Run `cache-inventory-analyst`
  first, then the advisor.
- **Partial evidence:** Still produce reports with labeled assumptions in
  the strategy section.
- **User asks to implement:** Refuse. This package is report-only unless
  they use a different agent.
- **User asks to run `caching-strategy-chat`:** Tell them chat-web is a
  separate entry. Do not call that agent from this flow.

## Interaction Contract

**Input:** optional `user-clarifications`.

**Output:** `inventory-report` and `strategy-report`.

When the host IDE provides a planning-only mode, use it for these steps.
MUST NOT start code implementation unless the user explicitly requests
execution with another agent.