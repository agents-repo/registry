---
name: issue-explore-and-create
description: >-
  Search related GitHub issues, draft a repo-shaped issue, and file it
  with gh after explicit confirmation. Does not plan implementation.
version: 1.0.0
license: MIT
agents:
  - idea-intake
  - related-issue-explorer
  - issue-drafter
  - issue-filer
inputs:
  - name: idea
    type: string
    description: Prompt text for a future implementation idea, or a pasted feature-brief.
  - name: repository
    type: string
    description: Optional target repository as owner/name when the checkout is ambiguous.
  - name: issue-kind
    type: string
    description: "Optional kind: feature, chore, docs, bug, or spec."
  - name: user-clarifications
    type: string
    description: Optional answers accumulated across clarification loops.
outputs:
  - name: overlap-report
    type: string
    description: Related open and closed issues with links, plus whether drafting must stop.
  - name: issue-draft
    type: string
    description: Repository, title, labels, markdown body, and related links. Empty when drafting is blocked.
  - name: issue-url
    type: string
    description: Created issue URL and number. Empty until filing succeeds.
  - name: open-questions
    type: string
    description: Remaining questions at handoff. Blocking items first.
---

# Overview

Turn a future-implementation idea into a filed GitHub issue. Search
existing issues, read the target repo just enough to shape the form, show
a draft, and create the issue only after an explicit yes.

`user-confirm` is a gate in this flow, not an agent id.

```text
intake → explore → draft → confirm → file
```

## Steps

1. **Intake** — Invoke `idea-intake` with `idea`, optional `repository`,
   optional `issue-kind`, and optional `user-clarifications`. If
   `blocking-questions` is non-empty, ask once, append the answers to
   `user-clarifications`, and repeat this step once.
2. **Explore** — Invoke `related-issue-explorer` with `idea` and
   `intake-summary`. Copy its `overlap-report` to the flow output.
3. **Duplicate stop** — When the report says to stop, ask whether the user
   still wants a new issue. Continue only if they say so. Otherwise leave
   `issue-draft` and `issue-url` empty and stop.
4. **Draft** — Invoke `issue-drafter` with `idea`, `intake-summary`,
   `overlap-report`, `template-excerpt`, and `user-clarifications`.
   Present repository, title, labels, body, and related links.
5. **Confirm** — Wait for an explicit yes to file that draft. Edits return
   to step 4. In a plan-only host session, stop here and ask the user to
   request execution of `issue-filer`. Do not set `file-confirmed`.
6. **File** — Invoke `issue-filer` with the accepted `issue-draft` and
   `file-confirmed` true. Copy `issue-url`. Then hand off the URL, the
   suggested branch `<prefix>/<number>-<slug>`, and
   `maiconfz/github-interactive-issue-implementation-planner`.

## Error Handling

- **Empty idea:** Ask for prompt text or a pasted feature-brief. Do not
  search or file.
- **Ambiguous repository:** Ask which `owner/name`. Do not guess.
- **`gh` auth failure:** Report `gh auth status`. Leave `issue-url` empty.
- **Rate limits:** Ask the user to retry later. Do not invent search hits.
- **Missing form for the kind:** Ask for another kind. Do not convert
  `spec` into chore when the repo has no spec form.
- **Vulnerability:** Stop. Point at the repo's private advisory path. Do
  not file a public issue.
- **Registry package submission or correction:** Stop. Point at those
  issue forms and `agents-repo/agents-repo-package-creation`.
- **Label rejected:** Stop and show the `gh` error. Do not drop the label
  and retry. Do not create a second issue.
- **Create succeeded:** Do not file that draft again.
- **Same blockers after three rounds:** Stop looping and surface the
  unresolved questions in `open-questions`.

## Interaction Contract

**Input:** `idea`, optional `repository`, optional `issue-kind`, optional
`user-clarifications`.

**Output:** `overlap-report`, `issue-draft`, `issue-url` (empty until
filing succeeds), and `open-questions`.

When the host IDE provides a planning-only mode, use it through step 5.
MUST NOT run `issue-filer` until the user explicitly requests execution.
MUST NOT open a branch, draft pull request, or mark anything ready for
review for the filed idea.
