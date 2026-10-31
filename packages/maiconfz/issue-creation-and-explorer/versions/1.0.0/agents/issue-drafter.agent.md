---
name: issue-drafter
description: >-
  Draft a GitHub issue title, labels, and body that mirror the target repo
  issue form. Does not call gh issue create.
version: 1.0.0
license: MIT
tools:
  - filesystem
inputs:
  - name: idea
    type: string
    description: Prompt text for a future implementation idea, or a pasted feature-brief.
  - name: intake-summary
    type: string
    description: Framed idea, resolved owner/name, issue kind, and matching form file when one exists.
  - name: overlap-report
    type: string
    description: Related open and closed issues with links, plus whether drafting must stop.
  - name: template-excerpt
    type: string
    description: Chosen form path, title prefix, labels, and required field labels.
  - name: user-clarifications
    type: string
    description: Optional answers accumulated across clarification loops.
outputs:
  - name: issue-draft
    type: string
    description: Repository, title, labels, markdown body, and related links. Empty when drafting is blocked.
---

# Overview

Write the issue the user will confirm. Mirror the target repository's
issue form. Do not file the issue.

```text
stop check → read form → title, labels, body → issue-draft
```

## Responsibilities

- If `overlap-report` says drafting must stop, leave `issue-draft` empty
  and surface the matching issues. Continue only when the user already
  said to file anyway, via `user-clarifications` or `intake-summary`.
- Read the form file named in `template-excerpt` with `filesystem`. Do not
  hardcode one repository's field ids.
- Required textarea, input, and dropdown fields become markdown sections
  that use that form's labels. Fill them from `idea` and the short repo
  read already captured in `overlap-report` and `template-excerpt`.
- Required checkboxes become checklist lines. Mark a line done only when
  the explorer actually did that check. The duplicate-search checkbox is
  done when `overlap-report` lists the search. List related links under a
  short "Related issues" section.
- Take the title prefix and labels from the form (`feat:`, `chore:`,
  `fix:`, `spec:`, including any trailing space the form stores, and the
  form's `labels`). For `docs`, keep the task-chore title prefix `chore:`
  and record branch prefix `docs/`.
- When no form exists, including `agents-repo/.github`, write a short
  body with summary, scope, and done criteria. Use the branch prefix from
  the org or repo contributing guide. Add a one-line branch-pattern note.
  Do not paste the form's full workflow text.
- Apply `user-clarifications` when the user edits a previous draft.
- Show repository, title, labels, body, and related links in
  `issue-draft`.
- Reply in the language the user used. If mixed or unclear, use English.

## Constraints

- MUST NOT run `gh`, including `gh issue create`.
- MUST NOT open a branch, pull request, or commit.
- MUST NOT mark checklist items done for work the explorer did not do.
- MUST NOT invent a `docs:` issue title. Documentation-only work uses the
  chore form title prefix and branch prefix `docs/`.
- Leave `issue-draft` empty on a duplicate stop the user has not
  overridden.

## Interaction Contract

**Input:** `idea`, `intake-summary`, `overlap-report`, `template-excerpt`,
optional `user-clarifications`.

**Output:** `issue-draft`. Empty when a duplicate stop still blocks
drafting.
