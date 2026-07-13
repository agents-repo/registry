---
name: github-pr-review-triage
description: >-
  GitHub PR review triage via gh: fetch threads, fix, commit, reply, and
  resolve. Use for Copilot or Bugbot inline feedback or closing review threads.
---
# Overview

Five-phase, project-agnostic workflow for addressing pull request review feedback
using the GitHub CLI (`gh`). Works in any repository where `gh` is
authenticated and the PR head branch is checked out locally.

```text
fetch → triage → fix → validate/commit/push → reply/resolve
```

## Responsibilities

- **Phase 1 — Fetch:** List unresolved review threads via GraphQL; supplement
  with REST inline comments and `gh pr view --comments` when helpful.
- **Phase 2 — Triage:** Produce a triage table before editing files. Classify
  each thread as `needs_fix`, `fixed_remote`, `wont_fix`, `by_design`, or
  `duplicate`.
- **Phase 3 — Fix:** Apply minimal scoped diffs. Do not reply or resolve
  threads during this phase.
- **Phase 4 — Validate, commit, push:** Run project-appropriate checks after
  local fixes (even without push permission). Commit and push the PR head
  branch when permitted. Capture commit SHA for Phase 5.
- **Phase 5 — Reply and resolve:** After a successful push, reply on each
  thread and resolve it with sequential GraphQL mutations.
- **Multi-PR / multi-repo:** Repeat the full cycle per repository before
  batch-resolving threads elsewhere.

## Constraints

- `gh` CLI MUST be authenticated for the target repository.
- Work on the PR head branch; do not implement fixes on the default branch.
- Commit and push ONLY when the user or task explicitly grants permission.
- Do not reply to or resolve review threads until the fix commit is pushed
  (or the thread is `fixed_remote` / reply-only with no push needed).
- Do not merge pull requests, push to the default branch, or mark a PR ready
  unless project policy explicitly allows agents to do so.
- When project docs exist (`CONTRIBUTING.md`, agent instruction files,
  `copilot-instructions.md`, `.cursor/rules/`), they override generic
  guidance in this agent.
- Validate automated review findings (for example Bugbot) before marking
  `needs_fix`.

## Interaction Contract

**Input:** Repository (`owner/name`), pull request number, and whether
commit/push is allowed.

**Output:** Triage table, list of changes (if any), commit SHA when pushed,
per-thread reply text, resolved-thread count, and a handoff summary.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth status`).
- Local checkout on the PR head branch (`gh pr checkout <n> --repo owner/name`
  when needed).
- Know `owner`, `repo`, and PR number (or discover via `gh pr view` from the
  current branch).

## Phase 1 — Fetch

Read the minimum payload. Filter to unresolved threads first.

1. **GraphQL (primary)** — unresolved review threads (`isResolved == false`).
2. **REST (secondary)** — `repos/{owner}/{repo}/pulls/{n}/comments` for extra
   inline context.
3. **Optional** — `gh pr view {n} --repo {owner}/{repo} --comments`.

Capture per thread: `threadId` (`PRRT_...`), `path`, `line`, first comment
body, author login.

### List unresolved threads

```bash
gh api graphql -f query='
  query($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          pageInfo { endCursor hasNextPage }
          nodes {
            id
            isResolved
            path
            line
            comments(first: 1) {
              nodes { body author { login } }
            }
          }
        }
      }
    }
  }' -f owner=OWNER -f name=REPO -F number=PR \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[]
    | select(.isResolved==false)
    | {id, path, line, author: .comments.nodes[0].author.login,
       body: .comments.nodes[0].body[0:200]}'
```

Paginate while `pageInfo.hasNextPage` is `true` — do not gate on unresolved
count. Each page returns up to 100 threads (resolved and unresolved mixed);
filter unresolved per page and accumulate results. When `hasNextPage` is
`true`, re-run with `reviewThreads(first: 100, after: "<endCursor>")` using
`pageInfo.endCursor` from the prior response. Stop when `hasNextPage` is
`false`.

### Count unresolved threads

After all pages are fetched, the unresolved total is the accumulated count
across pages — not the count from a single page. The jq snippet below counts
unresolved threads on one page only; repeat per page or sum after pagination
completes.

```bash
gh api graphql -f query='...' -f owner=OWNER -f name=REPO -F number=PR \
  --jq '[.data.repository.pullRequest.reviewThreads.nodes[]
    | select(.isResolved==false)] | length'
```

## Phase 2 — Triage

Write a triage table **before** editing files:

| Path | Line | Author | Outcome | Rationale |
| --- | --- | --- | --- | --- |
| ... | ... | ... | `needs_fix` | ... |

| Outcome | Action |
| --- | --- |
| `needs_fix` | Code or doc change required |
| `fixed_remote` | Already on branch; resolve citing existing SHA |
| `wont_fix` | Reply with rationale; no code change |
| `by_design` | Reply citing policy or docs |
| `duplicate` | Reply linking to resolving thread |

## Phase 3 — Fix

- Minimal scoped diffs; match surrounding conventions.
- Batch fixes per repository when one PR spans multiple files.
- Do **not** reply or resolve threads during this phase.
- After edits, proceed to Phase 4 validation before handoff or commit.
- If fixes touch normative specs or shared contracts, run that project's
  change-propagation rules before commit.

## Phase 4 — Validate, commit, push

### Validate

Run project-appropriate checks whenever Phase 3 applied code or doc changes,
regardless of `push-permission`. Skip validation only when the triage pass
produced no local edits (all threads are `fixed_remote`, `wont_fix`,
`by_design`, or `duplicate`). When validation fails, fix issues before handoff
or commit.

### Discover project checks

Inspect the repository root in this order:

1. **Agent / contributor docs** — `CONTRIBUTING.md`, `.github/copilot-instructions.md`,
   `.cursor/rules/`, and repo-specific agent guidelines.
2. **Git hooks** — `.husky/pre-commit` or `.git/hooks/pre-commit` for commands
   the project expects before commit.
3. **Package scripts** — when `package.json` exists, prefer `npm run` scripts
   named `lint`, `lint:all`, `test`, `test:run`, `typecheck`, or `env:check`.
   Use `npm run <script> -- --check` when scripts support dry-run flags.
4. **Other build entry points** — `Makefile`, `justfile`, `mise.toml`, or CI
   workflow files (`.github/workflows/`) for canonical validation commands.

When `package.json` declares `packageManager` for npm, run `corepack enable`,
`npm ci`, and `npm run env:check` before other npm scripts if hooks are
unavailable.

### Commit and push

Run only when `push-permission` is true or the user explicitly requests
commit/push.

- One commit per repository per triage pass; use the project's commit message
  convention when documented.
- Push the feature branch; capture commit SHA for Phase 5.
- **Hard rule:** do not reply or resolve until push succeeds (unless the
  thread is reply-only with no code change).

## Phase 5 — Reply and resolve

After push (or when no push is needed). Per thread, run **two sequential**
GraphQL mutations — do not combine in one call:

1. `addPullRequestReviewThreadReply`
2. `resolveReviewThread`

### Reply to a thread

```bash
gh api graphql -f query='
  mutation($threadId: ID!, $body: String!) {
    addPullRequestReviewThreadReply(input: {
      pullRequestReviewThreadId: $threadId
      body: $body
    }) {
      comment { id }
    }
  }' -f threadId="PRRT_..." -f body="Fixed in abc1234: summary."
```

### Resolve a thread

```bash
gh api graphql -f query='
  mutation($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread { isResolved }
    }
  }' -f threadId="PRRT_..." \
  --jq '.data.resolveReviewThread.thread.isResolved'
```

Do not use REST `pulls/comments/{id}/replies` for thread closure. Use GraphQL
thread IDs (`PRRT_...`).

### Reply templates

- Fixed: `Fixed in {sha}: {summary}.`
- Won't fix: `Intentional: {rationale}.`
- By design: `By design: {policy reference}.`
- Already fixed: `Addressed in {earlier_sha}: {summary}.`

Verify unresolved thread count is `0` per PR before handoff.

## Multi-repo orchestration

Per repository: `fix → validate → commit → push → threads`.

- Use `cd` to each repo root or `gh --repo owner/name` consistently.
- Verify local branch matches PR head before fixing.
- Do not batch-resolve threads before that repository's push lands.

## Checklist

```text
- [ ] Fetch unresolved threads (GraphQL primary)
- [ ] Triage table written
- [ ] Fixes applied
- [ ] Validation passed when fixes were applied (project-appropriate)
- [ ] Committed and pushed (if requested)
- [ ] Threads replied and resolved (post-push)
- [ ] Handoff summary (PR, SHA, resolved count)
```

## Handoff summary

| PR | Repo | Commit | Threads resolved | Notes |
| --- | --- | --- | --- | --- |
| #n | owner/repo | `abc1234` | 10/10 | all resolved |

## Declared capabilities

### Tools

- github

### Inputs

- `repository` (string): GitHub repository as owner/name (for example agents-repo/registry).
- `pull-request` (number): Pull request number to triage.
- `push-permission` (boolean): Whether commit and push are explicitly allowed for this pass.

### Outputs

- `triage-table` (string): Markdown table of threads with path, line, author, outcome, and rationale.
- `handoff-summary` (string): Summary with PR URL, commit SHA, threads resolved count, and notes.

<!-- agents-repo package version: 1.0.0 -->
