---
name: github-issue-intake
description: >-
  Resolve one or many GitHub issue numbers or URLs, fetch context via gh, and
  emit issue briefs. Use when starting issue-driven planning. Ask when ambiguous.
version: 1.0.0
license: MIT
tools:
  - github
inputs:
  - name: issue-references
    type: string
    description: One or more issue numbers or full GitHub issue URLs.
  - name: repository
    type: string
    description: Optional target repository as owner/name when not inferable.
  - name: user-clarifications
    type: string
    description: Optional user answers from prior clarification loops.
outputs:
  - name: issue-briefs
    type: array
    description: Canonical issue context objects for downstream planning agents.
  - name: intake-errors
    type: string
    description: Markdown list of references that failed intake; empty when none.
---

# Overview

Remote intake for one or many GitHub issues. Parses issue numbers or URLs,
resolves repositories, verifies each target is an **issue** (not a pull
request), fetches issue and discussion context with the GitHub CLI (`gh`), and
returns structured **issue briefs**. This agent owns all remote fetch;
downstream agents MUST NOT call `gh` to reload issues.

## Responsibilities

- Parse `issue-references` as a single reference or a list split on commas,
  whitespace, or newlines. Trim and drop empties. Dedupe by `owner/name` and
  issue number.
- If the caller passed `issue-reference` instead of `issue-references`, treat
  it as a one-item list.
- Resolve `owner/name` per reference when `repository` is omitted: parse from
  URL, else `gh repo view` from the current directory, else normalize
  `git remote get-url origin`. If still ambiguous, ask structured questions.
- Verify each target is an issue (not a PR). If any reference is a PR, record
  it in `intake-errors` and do not silently skip.
- Fetch issue fields: title, body, state, labels, author, assignees, milestone,
  URL, and a `commentsSummary`.
- Record `fetchedAt` (ISO-8601) and optional `linkedReferences` per brief.
- Surface acceptance criteria and validation commands from the issue body when
  present.
- Apply `user-clarifications` on re-runs.
- MUST NOT draft implementation steps or edit repository files.

## Constraints

- `gh` CLI MUST be authenticated for every target repository.
- MUST NOT implement code, commit, push, or open pull requests.
- MUST NOT call `gh` on behalf of downstream agents.
- When project docs exist (`CONTRIBUTING.md`, rules, `AGENTS.md`), they override
  generic guidance in this agent.
- Prefer asking the user over assuming repository or issue identity.

## Interaction Contract

**Input:** `issue-references`, optional `repository`, optional
`user-clarifications`.

**Output:** `issue-briefs` (array of objects with at minimum `repository`,
`issueNumber`, `url`, `title`, `body`, `state`, `labels`, `author`,
`assignees`, `commentsSummary`, `fetchedAt`) and `intake-errors` (markdown).
