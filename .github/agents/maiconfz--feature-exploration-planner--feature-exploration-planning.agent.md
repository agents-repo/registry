---
name: maiconfz--feature-exploration-planner--feature-exploration-planning
description: >-
  Orchestrate ask-first feature intake, routed landscape research, options
  analysis, and feature-brief synthesis. Planning only; does not implement.
version: 1.0.0
license: MIT
agents:
  - maiconfz--feature-exploration-planner--feature-intake
  - maiconfz--feature-exploration-planner--interactive-landscape-researcher
  - maiconfz--feature-exploration-planner--automatic-landscape-researcher
  - maiconfz--feature-exploration-planner--options-analyst
  - maiconfz--feature-exploration-planner--feature-definition-planner
inputs:
  - name: feature-idea
    type: string
    description: Prompt text or workspace path to an idea file.
  - name: research-mode
    type: string
    description: 'interactive, automatic, or skip; ask which to use when missing.'
  - name: user-clarifications
    type: string
    description: Optional user answers accumulated across clarification loops.
  - name: output-path
    type: string
    description: Optional workspace path to write feature-brief; omit for text only.
outputs:
  - name: feature-brief
    type: string
    description: Primary handoff markdown text from feature-definition-planner.
  - name: intake-summary
    type: string
    description: Structured intake from feature-intake.
  - name: landscape-report
    type: string
    description: Research report; empty when research-mode is skip.
  - name: options-summary
    type: string
    description: Options comparison from options-analyst.
  - name: open-questions
    type: string
    description: Remaining questions at handoff; blocking items first.
  - name: assumption-log
    type: string
    description: From automatic landscape research only; empty otherwise.
---
# Overview

End-to-end **planning-only** workflow for app feature exploration: frame the
idea against the host repo, optionally research the landscape, compare
options, and synthesize a **`feature-brief`** text output. Primary IDE entry
for this package. Does not include `feature-exploration-chat`.

```text
intake → research-mode → landscape → options → define → handoff
```

## Steps

1. **Idea** — If `feature-idea` is missing or empty, ask for prompt text or
   a valid idea-file path and stop. If the user supplies a GitHub issue URL or
   number, stop and point at
   `maiconfz/github-interactive-issue-implementation-planner`. If the idea is
   a registry package submission, stop and point at
   `agents-repo/agents-repo-package-creation`.

2. **Intake** — Invoke `feature-intake` with `feature-idea` and
   `user-clarifications`. If `blocking-questions` is non-empty, ask the user
   once, append answers to `user-clarifications`, and re-run intake **once**.
   If blockers remain, carry them into `open-questions` and continue with
   partial `intake-summary` when safe, or stop when intake is unusable.

3. **Research mode** — If `research-mode` is not `interactive`, `automatic`,
   or `skip`, ask which to use. Do not default.

4. **Landscape** — If `skip`, leave `landscape-report` and `assumption-log`
   empty. Otherwise invoke exactly one agent:
   - `interactive` → `interactive-landscape-researcher`
   - `automatic` → `automatic-landscape-researcher`
   Pass `intake-summary`, `feature-idea`, and `user-clarifications`. Copy
   `assumption-log` from automatic mode only; leave empty for interactive and
   skip. Do not loop either researcher.

5. **Options** — Invoke `options-analyst` one-shot with `intake-summary`,
   `landscape-report`, `feature-idea`, and `user-clarifications`.

6. **Define** — Invoke `feature-definition-planner` one-shot with all prior
   artifacts and `user-clarifications`.

7. **Write-back** — If `output-path` is set and `feature-brief` is non-empty,
   write that file only. If omitted, return text in flow outputs.

8. **Handoff** — Present `feature-brief` and supporting artifacts. Aggregate
   leftover intake blockers and non-blocking follow-ups from later agents into
   `open-questions` (blocking first). Suggest next steps (document only):
   - Copy `feature-brief` into a **new GitHub issue**, then run
     `maiconfz/github-interactive-issue-implementation-planner` with that
     issue number
   - If the user later drafts an **implementation plan**, run
     `maiconfz/plan-refiner` on that plan
   - Implementation requires an explicit user request

When the host IDE provides a planning-only mode, use it for these steps.
MUST NOT start code implementation unless the user explicitly requests
execution with another agent.

## Error Handling

- **Empty or unusable `feature-idea`:** Ask for prompt text or a valid
  idea-file path; stop.
- **GitHub issue URL or number supplied:** Stop. Point at
  `maiconfz/github-interactive-issue-implementation-planner`; do not invoke
  that package from this flow.
- **Registry package idea:** Stop. Point at
  `agents-repo/agents-repo-package-creation` / `package-requirements-analyst`.
- **Unreadable host workspace:** Report and stop stages that need
  `filesystem`; do not invent a codebase.
- **Same blockers after the one intake clarification cycle:** Stop looping;
  carry partial artifacts and leftover questions into handoff.
- **Web search unavailable:** Interactive researcher asks for pasted
  references; automatic researcher records gaps in `assumption-log`.
- **User asks to implement during this flow:** Refuse; this package is
  plan-only.

## Interaction Contract

**Input:** `feature-idea`, optional `research-mode`, optional
`user-clarifications`, optional `output-path`.

**Output:** `feature-brief`, `intake-summary`, `landscape-report`,
`options-summary`, `open-questions`, and `assumption-log`.
