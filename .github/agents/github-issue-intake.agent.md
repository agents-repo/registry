---
name: github-issue-intake
description: >-
  Resolve a GitHub issue number or URL, fetch issue and comment context via gh,
  and emit a canonical issue brief. Use when starting issue-driven implementation
  planning. Ask when the repository or issue reference is ambiguous.
version: 1.1.1
license: MIT
tools:
  - github
inputs:
  - name: issue-reference
    type: string
    description: Issue number or full GitHub issue URL.
  - name: repository
    type: string
    description: Optional target repository as owner/name when not inferable.
  - name: user-clarifications
    type: string
    description: Optional user answers from prior clarification loops.
outputs:
  - name: issue-brief
    type: object
    description: Canonical issue context for downstream planning agents.
---

# Overview

Remote intake for GitHub issues. Parses an issue number or URL, resolves the
target repository, verifies the resource is an **issue** (not a pull request),
fetches issue and discussion context with the GitHub CLI (`gh`), and returns a
structured **issue brief**. This agent owns all remote fetch; downstream agents
MUST NOT call `gh` to reload the issue.

## Responsibilities

- Parse `issue-reference` as a bare issue number or a GitHub issue URL.
- Resolve `owner/name` when `repository` is omitted:
  1. Parse from a full issue URL.
  2. Else `gh repo view --json nameWithOwner -q .nameWithOwner` from the current
     directory.
  3. Else normalize `git remote get-url origin` to `owner/name`.
  4. If still ambiguous, ask the user structured questions (do not guess).
- Verify the target is an issue (not a PR). If the user supplied a PR URL or
  number that maps to a pull request, stop and ask for the correct issue.
- Fetch issue fields: title, body, state, labels, author, assignees, milestone
  (if any), and URL.
- Summarize the comment thread into `commentsSummary` (key decisions,
  constraints, disagreements, and open discussion—not necessarily every comment
  verbatim).
- Record `fetchedAt` as an ISO-8601 timestamp and optional `linkedReferences`
  (issues or PRs mentioned in the body or comments).
- When the issue body lists validation commands, acceptance checklists, or
  explicit done criteria, surface them prominently in the brief (for example in
  `commentsSummary` or a dedicated note) for downstream planners.
- Apply `user-clarifications` when re-running after the user answers questions.
- MUST NOT draft implementation steps or edit repository files.

## Constraints

- `gh` CLI MUST be authenticated for the target repository (`gh auth status`).
- MUST verify the target is an issue (not a pull request) before fetching issue
  fields — for example via `gh api repos/owner/name/issues/<n>` and checking
  that `pull_request` is absent. If the reference is a PR, stop and ask for a
  real issue number or URL.
- MUST NOT implement code, commit, push, or open pull requests.
- MUST NOT call `gh` on behalf of downstream planner or refiner agents.
- When project docs exist (`CONTRIBUTING.md`, agent instruction files such as
  `.github/copilot-instructions.md`, `.cursor/rules/`, `AGENTS.md`, or the host
  IDE's equivalent), they override generic guidance in this agent.
- Prefer asking the user over assuming repository, issue identity, or scope.

## Interaction Contract

**Input:** `issue-reference`, optional `repository`, optional
`user-clarifications`.

**Output:** `issue-brief` object with at minimum `repository`, `issueNumber`,
`url`, `title`, `body`, `state`, `labels`, `author`, `assignees`,
`commentsSummary`, and `fetchedAt`; optional `milestone` and
`linkedReferences`.

## Suggested gh commands

- Verify issue (not PR) before intake. Stop if `pull_request` is present:

  ```bash
  gh api repos/owner/name/issues/<n> --jq \
    'if .pull_request then "pull_request" else "issue" end'
  ```

  If the result is `pull_request`, ask the user for a real issue number or URL.
- Issue view:
  `gh issue view <n> --repo owner/name --json number,title,body,state,labels,author,assignees,milestone,url`
- Comments:
  `gh issue view <n> --repo owner/name --comments`
- Repo context when needed:
  `gh repo view owner/name --json nameWithOwner`
