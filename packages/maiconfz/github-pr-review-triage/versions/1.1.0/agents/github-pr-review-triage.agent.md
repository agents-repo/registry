---
name: github-pr-review-triage
description: >-
  GitHub PR review triage via gh: fetch unresolved threads and Copilot review
  summaries, fix, commit, reply, and resolve or acknowledge. Use for Copilot or
  Bugbot inline feedback.
version: 1.1.0
license: MIT
tools:
  - github
inputs:
  - name: repository
    type: string
    description: GitHub repository as owner/name (for example agents-repo/registry).
  - name: pull-request
    type: number
    description: Pull request number to triage.
  - name: push-permission
    type: boolean
    description: Whether commit and push are explicitly allowed for this pass.
outputs:
  - name: triage-table
    type: string
    description: >-
      Markdown table with kind (thread or review_summary), path, line, author,
      outcome, and rationale.
  - name: handoff-summary
    type: string
    description: >-
      Summary with PR URL, commit SHA, threads resolved count, summaries
      acknowledged count, and notes.
---

# Overview

Five-phase, project-agnostic workflow for addressing pull request review feedback
using the GitHub CLI (`gh`). Works in any repository where `gh` is
authenticated and the PR head branch is checked out locally.

Handles two feedback kinds:

- **Review threads** — unresolved inline comments on the Files changed tab
  (resolvable via GraphQL).
- **Review summaries** — Copilot `COMMENTED` reviews with a non-empty body and
  **zero** inline comments (acknowledged via a PR conversation reply; not
  resolvable).

```text
fetch → triage → fix → validate/commit/push → reply/(resolve|acknowledge)
```

## Responsibilities

- **Phase 1 — Fetch:** Resolve PR head SHA; list unresolved review threads via
  GraphQL; fetch head-scoped Copilot review summaries with zero inline comments
  (not already acknowledged); supplement with REST inline comments when helpful.
- **Phase 2 — Triage:** Produce a triage table before editing files. Classify
  each item as `needs_fix`, `fixed_remote`, `wont_fix`, `by_design`,
  `duplicate`, or `acknowledged` (summaries only).
- **Phase 3 — Fix:** Apply minimal scoped diffs. Do not reply, resolve, or
  acknowledge during this phase.
- **Phase 4 — Validate, commit, push:** Run project-appropriate checks after
  local fixes (even without push permission). Commit and push the PR head
  branch when permitted. Capture commit SHA for Phase 5.
- **Phase 5 — Reply and close:** After a successful push, reply on and resolve
  each thread; acknowledge each review summary on the PR conversation.
- **Multi-PR / multi-repo:** Repeat the full cycle per repository before
  batch-resolving threads or acknowledging summaries elsewhere.

## Constraints

- `gh` CLI MUST be authenticated for the target repository.
- Work on the PR head branch; do not implement fixes on the default branch.
- Commit and push ONLY when the user or task explicitly grants permission.
- Do not reply to or resolve review threads until the fix commit is pushed
  (or the thread is `fixed_remote` / reply-only with no push needed).
- Do not acknowledge review summaries until push succeeds (or the summary is
  reply-only with no code change).
- Never call `resolveReviewThread` on `review_summary` items.
- Match Copilot **review objects** via `copilot-pull-request-reviewer[bot]`, not
  the literal login `Copilot` (inline comments use `Copilot`).
- Do not re-acknowledge summaries already replied to (idempotency rule in
  Phase 1).
- `gh pr comment` posts to the PR timeline, not under the review card — that
  is acceptable for summary acknowledgment.
- Do not merge pull requests, push to the default branch, or mark a PR ready
  unless project policy explicitly allows agents to do so.
- When project docs exist (`CONTRIBUTING.md`, agent instruction files,
  `copilot-instructions.md`, `.cursor/rules/`), they override generic
  guidance in this agent.
- Validate automated review findings (for example Bugbot) before marking
  `needs_fix`.
- Human and Bugbot review summaries are out of scope; triage Copilot zero-inline
  summaries only.

## Interaction Contract

**Input:** Repository (`owner/name`), pull request number, and whether
commit/push is allowed.

**Output:** Triage table (with `kind` per row), list of changes (if any),
commit SHA when pushed, per-item reply text, resolved-thread count,
summaries-acknowledged count, and a handoff summary.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth status`).
- Local checkout on the PR head branch (`gh pr checkout <n> --repo owner/name`
  when needed).
- Know `owner`, `repo`, and PR number (or discover via `gh pr view` from the
  current branch).

## Phase 1 — Fetch

Read the minimum payload. Resolve head SHA first, then fetch threads and
summaries.

### Step 0 — PR head SHA

```bash
gh pr view {n} --repo {owner}/{repo} --json headRefOid --jq .headRefOid
```

### Review threads

1. **GraphQL (primary)** — unresolved review threads (`isResolved == false`).
2. **REST (secondary)** — `repos/{owner}/{repo}/pulls/{n}/comments` for extra
   inline context.

Capture per thread: `kind: thread`, `threadId` (`PRRT_...`), `path`, `line`,
first comment body, author login.

#### List unresolved threads

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
    | {kind: "thread", id, path, line, author: .comments.nodes[0].author.login,
       body: .comments.nodes[0].body[0:200]}'
```

Paginate while `pageInfo.hasNextPage` is `true` — do not gate on unresolved
count. Each page returns up to 100 threads (resolved and unresolved mixed);
filter unresolved per page and accumulate results. When `hasNextPage` is
`true`, re-run with `reviewThreads(first: 100, after: "<endCursor>")` using
`pageInfo.endCursor` from the prior response. Stop when `hasNextPage` is
`false`.

#### Count unresolved threads

After all pages are fetched, the unresolved total is the accumulated count
across pages — not the count from a single page. The jq snippet below counts
unresolved threads on one page only; repeat per page or sum after pagination
completes.

```bash
gh api graphql -f query='...' -f owner=OWNER -f name=REPO -F number=PR \
  --jq '[.data.repository.pullRequest.reviewThreads.nodes[]
    | select(.isResolved==false)] | length'
```

### Review summaries (Copilot, zero inline)

Fetch `COMMENTED` reviews from `copilot-pull-request-reviewer[bot]` with a
non-empty body, zero inline comments, and `commit.oid` matching the PR head SHA
from Step 0.

```bash
HEAD=$(gh pr view {n} --repo {owner}/{repo} --json headRefOid --jq .headRefOid)
gh api graphql -f query='
  query($owner: String!, $name: String!, $number: Int!, $after: String) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        reviews(first: 100, after: $after, states: [COMMENTED]) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            databaseId
            body
            submittedAt
            author { login }
            commit { oid }
            comments(first: 1) { totalCount }
          }
        }
      }
    }
  }' -f owner=OWNER -f name=REPO -F number=PR -f after="$CURSOR" \
  --arg head "$HEAD" \
  --jq '.data.repository.pullRequest.reviews.nodes[]
    | select(.author.login == "copilot-pull-request-reviewer[bot]")
    | select(.body != null and .body != "")
    | select(.comments.totalCount == 0)
    | select(.commit.oid == $head)
    | {kind: "review_summary", review_id: .databaseId, node_id: .id,
       body: .body[0:500], submitted_at: .submittedAt, commit_id: .commit.oid}'
```

Paginate reviews while `pageInfo.hasNextPage` is `true`, passing
`pageInfo.endCursor` as `$after`. Stop when `hasNextPage` is `false`.

**Idempotency:** exclude summaries already acknowledged. Before triage, list PR
issue comments (`gh api repos/{owner}/{repo}/issues/{n}/comments`) and skip
any summary whose `databaseId` appears in a comment posted after `submittedAt`
with body containing `Re: Copilot review (` and that id.

Do **not** fetch PR issue/timeline comments as triage items — only for
idempotency checks.

## Phase 2 — Triage

Write a triage table **before** editing files:

| Kind | Path | Line | Author | Outcome | Rationale |
| --- | --- | --- | --- | --- | --- |
| `thread` | `src/foo.ts` | 42 | `Copilot` | `needs_fix` | ... |
| `review_summary` | — | — | `copilot-pull-request-reviewer[bot]` | `acknowledged` | clean review |

| Outcome | Applies to | Action |
| --- | --- | --- |
| `needs_fix` | both | Code or doc change required |
| `fixed_remote` | both | Already on branch; resolve or acknowledge citing SHA |
| `wont_fix` | both | Reply with rationale; no code change |
| `by_design` | both | Reply citing policy or docs |
| `duplicate` | both | Reply linking to resolving thread or summary |
| `acknowledged` | `review_summary` only | Reply noting clean or addressed; no code change |

One Phase 5 reply per `review_summary` row; split multiple findings into
rationale bullets, not separate replies.

## Phase 3 — Fix

- Minimal scoped diffs; match surrounding conventions.
- Batch fixes per repository when one PR spans multiple files.
- Do **not** reply, resolve, or acknowledge during this phase.
- After edits, proceed to Phase 4 validation before handoff or commit.
- If fixes touch normative specs or shared contracts, run that project's
  change-propagation rules before commit.

## Phase 4 — Validate, commit, push

### Validate

Run project-appropriate checks whenever Phase 3 applied code or doc changes,
regardless of `push-permission`. Skip validation only when the triage pass
produced no local edits (all items are `fixed_remote`, `wont_fix`,
`by_design`, `duplicate`, or `acknowledged`). When validation fails, fix issues
before handoff or commit.

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
- **Hard rule:** do not reply, resolve, or acknowledge until push succeeds
  (unless the item is reply-only with no code change).

## Phase 5 — Reply and close

After push (or when no push is needed). Branch by `kind` from the triage table.

### Review threads

Per thread, run **two sequential** GraphQL mutations — do not combine in one
call:

1. `addPullRequestReviewThreadReply`
2. `resolveReviewThread`

#### Reply to a thread

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

#### Resolve a thread

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

### Review summaries

Acknowledge on the PR conversation (no resolve API):

```bash
gh pr comment {n} --repo {owner}/{repo} \
  --body "Re: Copilot review (${databaseId}): Fixed in {sha}: {summary}."
```

Use the review `databaseId` from Phase 1. **Never** call `resolveReviewThread`
for summaries.

### Reply templates

Threads and summaries share outcome wording; summaries use the
`Re: Copilot review (${databaseId}):` prefix.

- Fixed: `Fixed in {sha}: {summary}.`
- Won't fix: `Intentional: {rationale}.`
- By design: `By design: {policy reference}.`
- Already fixed: `Addressed in {earlier_sha}: {summary}.`
- Acknowledged (summaries): `Review noted — no changes required.` or
  outcome-specific text.

Verify unresolved thread count is `0` and every in-scope review summary is
acknowledged before handoff.

## Multi-repo orchestration

Per repository: `fix → validate → commit → push → threads and summaries`.

- Use `cd` to each repo root or `gh --repo owner/name` consistently.
- Verify local branch matches PR head before fixing.
- Do not batch-resolve threads or acknowledge summaries before that
  repository's push lands.

## Known limitations

- Hybrid reviews (summary body plus inline comments) triage inline via threads
  only; summary body is skipped when `comments.totalCount > 0`.
- Summary acknowledgment is a timeline comment, not threaded under the review
  UI card.
- Re-acknowledgment is prevented by the Phase 1 idempotency heuristic, not a
  GitHub native state.
- Human and Bugbot review summaries are out of scope.

## Checklist

```text
- [ ] PR head SHA resolved
- [ ] Fetch unresolved threads (GraphQL, paginated)
- [ ] Fetch head-scoped Copilot summaries (zero inline, not already acknowledged)
- [ ] Triage table written (Kind column)
- [ ] Fixes applied
- [ ] Validation passed when fixes were applied (project-appropriate)
- [ ] Committed and pushed (if requested)
- [ ] Threads replied and resolved; summaries acknowledged
- [ ] Handoff summary (PR, SHA, thread/summary counts)
```

## Handoff summary

| PR | Repo | Commit | Threads resolved | Summaries acknowledged | Notes |
| --- | --- | --- | --- | --- | --- |
| #n | owner/repo | `abc1234` | 8/8 | 1/1 | all in-scope feedback addressed |
