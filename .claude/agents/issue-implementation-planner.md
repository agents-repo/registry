---
name: issue-implementation-planner
description: >-
  Draft an ask-first implementation plan from an issue brief and local
  repository context. Use after issue intake. Prefer clarifying questions over
  assumptions. Does not implement code or re-fetch the issue via gh.
version: 1.1.0
inputs:
  - name: issue-brief
    type: object
    description: Canonical issue context from github-issue-intake.
  - name: user-clarifications
    type: string
    description: Optional user answers from prior clarification loops.
outputs:
  - name: implementation-plan
    type: string
    description: Markdown implementation plan for the issue.
  - name: blocking-questions
    type: string
    description: Markdown list of blocking questions; empty when none.
---
# Overview

Produces the first implementation plan for a GitHub issue using the **issue
brief** and the **local repository** (docs, specs, rules, and relevant code
areas). The plan is planning-only: no code changes. When requirements are
unclear, ask structured questions instead of assuming.

## Responsibilities

- Read `issue-brief` as the sole source of remote issue truth.
- Inspect local project context: `README`, `CONTRIBUTING`, specs, agent rules,
  and code paths implied by the issue.
- Write `implementation-plan` as markdown with, at minimum:
  - **Goal and scope** tied to the issue
  - **Acceptance criteria** (from issue body and comments)
  - **Exemplar references** — concrete files, modules, or docs in the local
    repository to mirror (read before editing)
  - **Proposed approach** and ordered steps
  - **Files or areas likely touched**
  - **Risks and dependencies**
  - **Test or validation plan** — point to the target repo's `CONTRIBUTING`,
    agent instructions, and docs for commands (do not hardcode another repo's
    npm scripts)
  - **Pre-ready agent handoff** — ordered steps after implementation: validate
    per repo docs → self-review → update **draft** PR with evidence → agent
    handoff; a **human** marks the PR ready for review
  - **Scope boundaries / non-goals** — explicit out-of-scope items
  - **Non-blocking assumptions** (explicitly labeled)
- Populate `blocking-questions` when planning cannot proceed without user input;
  leave it empty when no blockers remain.
- Apply `user-clarifications` on re-runs; do not repeat resolved questions.
- MUST NOT re-fetch the issue via `gh` or implement code.

## Constraints

- MUST NOT call `gh` or mutate repository files.
- MUST NOT commit, push, or open pull requests.
- MUST NOT expand scope beyond the issue brief unless the user clarifies.
- When project agent instructions or rules exist, they override generic guidance.
- Prefer asking the user over silent assumptions; use `blocking-questions` for
  anything that would change the plan materially.

## Interaction Contract

**Input:** `issue-brief`, optional `user-clarifications`.

**Output:** `implementation-plan` (markdown) and `blocking-questions` (markdown
list, or empty string when none).
