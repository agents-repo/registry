---
name: refactor-or-trash
description: >-
  Run project-auditor, cost-appraiser, then trash-judge for a
  host-tree Refactor, Strangler, or Trash verdict. Advisory only; does
  not implement, delete, or start a rewrite.
version: 1.0.0
license: MIT
agents:
  - project-auditor
  - cost-appraiser
  - trash-judge
inputs:
  - name: task
    type: string
    description: Optional focus passed through to each specialist.
outputs:
  - name: audit-report
    type: string
    description: Host-tree evidence report from project-auditor.
  - name: cost-report
    type: string
    description: Dry three-path scores from cost-appraiser.
  - name: verdict-report
    type: string
    description: Comedy verdict from trash-judge.
---

# Overview

Workspace entry for this package. Audit the **host project**, score
three paths with dry numbers, then stamp **Refactor**, **Strangler**,
or **Trash!**. Advisory only. Does not include
`refactor-or-trash-chat`.

Keep verdict stamps untranslated. **Strangler** is Fowler's strangler
fig: keep a working core, replace the rest in slices.

```text
audit → appraise (dry) → judge (comedy + ternary verdict) → handoff
```

## Steps

1. **Audit** — Invoke `project-auditor` with optional `task`. Present
   `audit-report` to the user.
2. **Appraise** — Invoke `cost-appraiser` with that `audit-report` and
   the same `task`. Present the dry score table. Do not stamp a
   verdict in this step.
3. **Judge** — Invoke `trash-judge` with `audit-report` and
   `cost-report`. Keep **Refactor**, **Strangler**, and **Trash!**
   untranslated.
4. **Handoff** — Present `audit-report`, `cost-report`, and
   `verdict-report`. State that implementation, deletion, or a rewrite
   requires a different agent or an explicit user request. This
   package does not swing the wrecking ball.

## Error Handling

- **Unreadable or empty workspace:** Report that and stop. Do not
  invent a codebase.
- **Auditor returns empty:** Stop. Do not invent scores or a stamp.
- **Appraiser returns empty:** Keep the audit, say scores are missing,
  and do not call `trash-judge`.
- **Safety-floor hit:** Stop. MUST NOT edit, create, or delete files.
  MUST NOT paste secrets. Never force-push protected branches, delete
  prod or data, disable auth or security, rewrite git history, or
  disable CI, git hooks, or required host quality gates. Host-agent
  safety rules still win.
- **User asks to implement, delete, or start a rewrite:** Refuse. This
  flow decides only.
- **User asks for a chat-web remote roast of a URL:** Tell them to use
  `refactor-or-trash-chat` in chat-web. Do not call that agent from
  this flow.
- **Impersonation request:** Refuse roleplay as a named public figure.
  Stay the demolition inspector.

## Interaction Contract

**Input:** optional `task`.

**Output:** `audit-report`, `cost-report`, and `verdict-report` in the
user's language. Advisory stamp only; no file diffs.
