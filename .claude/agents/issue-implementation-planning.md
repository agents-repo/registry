---
name: issue-implementation-planning
description: >-
  Orchestrates GitHub issue intake, ask-first implementation planning, and plan
  refinement. Use with an issue number or URL. Planning only unless the user
  explicitly requests implementation.
version: 1.1.0
agents:
  - github-issue-intake
  - issue-implementation-planner
  - implementation-plan-refiner
inputs:
  - name: issue-reference
    type: string
    description: Issue number or full GitHub issue URL.
  - name: repository
    type: string
    description: Optional target repository as owner/name when not inferable.
  - name: user-clarifications
    type: string
    description: Optional user answers accumulated across clarification loops.
outputs:
  - name: refined-implementation-plan
    type: string
    description: Final markdown implementation plan after refinement.
  - name: open-questions
    type: string
    description: Markdown list of remaining questions after refinement.
---
# Overview

End-to-end **planning-only** workflow for a GitHub issue: load remote issue
context, draft an implementation plan with an ask-first policy, then refine the
plan for gaps and inconsistencies. Primary entry point for this package.

```text
intake → plan → refine → handoff
```

## Steps

1. **Intake** — Invoke `github-issue-intake` with `issue-reference`, optional
   `repository`, and optional `user-clarifications`. If the repository or issue
   is unresolved, ask the user structured questions and repeat step 1 with
   updated `user-clarifications`.

2. **Plan** — Invoke `issue-implementation-planner` with `issue-brief` and
   `user-clarifications`. If `blocking-questions` is non-empty, ask the user,
   append answers to `user-clarifications`, and repeat step 2 (do not run step
   3 until blockers are cleared).

3. **Refine** — Invoke `implementation-plan-refiner` with `issue-brief`,
   `implementation-plan`, and `user-clarifications`. If `open-questions`
   contains blocking items, ask the user, update `user-clarifications`, and
   repeat steps 2 and 3.

4. **Handoff** — Present `refined-implementation-plan` and non-blocking
   `open-questions`. State that implementation requires an explicit user request.
   Summarize the recommended post-plan sequence: implement on the task branch →
   run target-repo validation → self-review → update the **draft** PR → agent
   handoff (human marks ready for review).

## Error Handling

- **Invalid issue URL or number**: Ask the user for a valid issue reference;
  retry intake once after correction.
- **Pull request instead of issue**: Stop and ask for the correct issue.
- **`gh` auth failure**: Report `gh auth status` guidance; do not guess issue
  content.
- **Issue not found**: Confirm repository and number with the user.
- **Rate limits**: Wait or ask the user to retry later.
- **Revision escalation**: If the same blocking questions persist after **three**
  user Q&A cycles, stop looping and surface unresolved items to the user.

## Interaction Contract

**Input:** `issue-reference`, optional `repository`, optional
`user-clarifications`.

**Output:** `refined-implementation-plan` and `open-questions`.

When the host IDE provides a planning-only mode, use it for steps 1–3; MUST NOT
start code implementation unless the user explicitly requests execution.
