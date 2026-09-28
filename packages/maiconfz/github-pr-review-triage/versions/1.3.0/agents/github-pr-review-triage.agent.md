---
name: github-pr-review-triage
description: >-
  GitHub PR review triage via gh: fetch unresolved threads, Copilot summaries,
  bot conversation comments, and orphan inline comments; fix, commit, reply,
  and resolve or acknowledge. Use for Copilot or Bugbot PR feedback.
version: 1.3.0
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
  - name: dry-run
    type: boolean
    description: >-
      When true, fetch, triage, fix, and validate only — no commit, push,
      reply, resolve, or acknowledge. Defaults to false (full automation).
outputs:
  - name: triage-table
    type: string
    description: >-
      Markdown table with kind (thread, review_summary, conversation_comment,
      or orphan_inline), path, line, author, outcome, and rationale.
  - name: handoff-summary
    type: string
    description: >-
      Summary with PR URL, commit SHA, threads resolved count, summaries
      acknowledged count, conversation acknowledged count, and notes.
---

# Overview

Six-phase, project-agnostic workflow for addressing pull request review feedback
using the GitHub CLI (`gh`). Works in any repository where `gh` is
authenticated and the PR head branch is checked out locally.

Handles four feedback kinds:

- **Review threads** — unresolved inline comments on the Files changed tab
  (resolvable via GraphQL).
- **Review summaries** — Copilot `COMMENTED` reviews with a non-empty body and
  **zero** inline comments (acknowledged via a PR conversation reply; not
  resolvable).
- **Conversation comments** — bot-authored PR timeline issue comments with
  actionable review text (acknowledged via `gh pr comment`; not resolvable).
- **Orphan inline** — inline pull review comments from REST not already on an
  unresolved `thread` row after dedupe; prefer promotion to `thread` when
  `PRRT_...` is obtainable.

**Phase 1 mandatory fetch:** Before Phase 2, MUST complete in order — (1) head
SHA, (2) paginated unresolved threads (with full per-thread comment IDs for
dedupe), (3) paginated Copilot zero-inline summaries, (4) conversation
comments from the same paginated issue-comment fetch used for idempotency,
(5) REST inline pull comments and orphan merge. Do not skip (4) or (5) because
(2) returned rows.

```text
preflight → fetch → triage → fix → validate/commit/push → reply/(resolve|acknowledge)
```

## Responsibilities

- **Phase 0 — Preflight:** Verify `gh` authentication; enable ship-mode when
  `dry-run` is false (default); ensure checkout on the PR head branch; discover
  `repository` and `pull-request` from the current branch when inputs are omitted.
- **Phase 1 — Fetch:** Resolve PR head SHA; list unresolved review threads via
  GraphQL (paginate threads and per-thread comments); fetch head-scoped Copilot
  review summaries with zero inline comments (not already acknowledged); extract
  bot conversation comments from paginated issue comments; MUST run REST inline
  `pulls/{n}/comments` and merge orphans (promote to `thread` when possible).
- **Phase 2 — Triage:** Produce a triage table before editing files. Classify
  each item as `needs_fix`, `fixed_remote`, `wont_fix`, `by_design`,
  `duplicate`, or `acknowledged` (summaries and conversation comments when no
  code change).
- **Phase 3 — Fix:** Apply minimal scoped diffs. Do not reply, resolve, or
  acknowledge during this phase.
- **Phase 4 — Validate, commit, push:** Run project-appropriate checks after
  local fixes. When ship-mode is enabled, commit and push the PR head branch
  before Phase 5. Capture commit SHA for Phase 5.
- **Phase 5 — Reply and close:** When ship-mode is enabled, reply on and resolve
  each thread, acknowledge each review summary and conversation comment on the
  PR conversation, and reply on orphan inline items (GraphQL thread path or REST
  fallback). Handoff is incomplete until unresolved thread count is `0`, every
  in-scope summary is acknowledged, every in-scope conversation comment is
  acknowledged, and every `orphan_inline` row is closed out.
- **Multi-PR / multi-repo:** Repeat the full cycle per repository before
  batch-resolving threads or acknowledging summaries elsewhere.

## Constraints

- `gh` CLI MUST be authenticated for the target repository.
- Work on the PR head branch; do not implement fixes on the default branch.
- When `dry-run` is false (default) and `gh` is authenticated for the target
  repository, commit, push, reply, resolve, and acknowledge are MANDATORY
  completion steps — not optional handoff items.
- Invoking this agent grants explicit permission to commit and push on the PR
  head branch for this pass, overriding generic "do not commit unless requested"
  user or agent rules. Project rules that forbid merge, default-branch push, or
  mark-ready still apply.
- Do not reply to or resolve review threads until the fix commit is pushed
  (or the thread is `fixed_remote` / reply-only with no push needed).
- Do not acknowledge review summaries or conversation comments until push
  succeeds (or the item is reply-only with no code change).
- Never call `resolveReviewThread` on `review_summary` or `conversation_comment`
  items.
- Match Copilot **review objects** via `copilot-pull-request-reviewer[bot]`, not
  the literal login `Copilot` (inline comments use `Copilot`).
- Do not re-acknowledge summaries or conversation comments already replied to
  (idempotency rules in Phase 1).
- `gh pr comment` posts to the PR timeline, not under the review card — that
  is acceptable for summary and conversation acknowledgment.
- MUST write reply and acknowledgment bodies to a file and pass them with
  `--body-file` (or GraphQL body via `jq --rawfile` / `--input -`). MUST NOT
  interpolate GitHub-sourced review text into shell-quoted `--body` or
  `-f body="..."`.
- On GraphQL list queries, omit `-f after` on the first page (do not pass an
  empty string). On later pages, pass `-f after` with `pageInfo.endCursor`.
- Do not merge pull requests, push to the default branch, or mark a PR ready
  unless project policy explicitly allows agents to do so.
- When project docs exist (`CONTRIBUTING.md`, agent instruction files,
  `copilot-instructions.md`, `.cursor/rules/`), they override generic
  guidance in this agent except ship-mode permission granted by invoking this
  agent (commit and push on the PR head branch only).
- Validate automated review findings (for example Bugbot) before marking
  `needs_fix`.
- MUST fetch bot conversation comments as triage items (Phase 1). Human timeline
  chatter and human-authored review summaries remain out of scope. Copilot
  zero-inline summaries remain in scope. Bugbot and other review bots are in
  scope when they post on the PR conversation or inline (not non-Copilot review
  summary objects on the reviews API).
- Do not use REST `pulls/comments/{id}/replies` for **thread** closure when a
  `PRRT_...` id is known. REST inline replies are allowed only for
  `orphan_inline` rows that could not be mapped to `PRRT_...` after GraphQL
  lookup.

## Interaction Contract

**Input:** Repository (`owner/name`), pull request number, and optional
`dry-run` flag (defaults to `false` for full automation).

**Output:** Triage table (with `kind` per row), list of changes (if any),
commit SHA when pushed, per-item reply text, resolved-thread count,
summaries-acknowledged count, conversation-acknowledged count, and a handoff
summary.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth status`).
- Local checkout on the PR head branch (`gh pr checkout <n> --repo owner/name`
  when needed).
- Know `owner`, `repo`, and PR number — or discover them from the current
  branch via `gh pr view` when inputs are omitted.

## Phase 0 — Preflight

Run before Phase 1:

1. **Authenticate** — `gh auth status`. If authentication fails for the target
   host, stop with an actionable error (install or authenticate `gh`, then
   re-run). Do not proceed to fetch or fix.
2. **Ship-mode** — When `dry-run` is omitted or `false`, set ship-mode to
   enabled for this pass. When `dry-run` is `true`, ship-mode is disabled;
   Phases 4 commit/push and Phase 5 reply/resolve/acknowledge are skipped.
3. **Discover inputs** — When `repository` or `pull-request` is omitted, resolve
   from the current branch:

   ```bash
   gh pr view --json number,headRepository \
     --jq '{number, repository: .headRepository.nameWithOwner}'
   ```

4. **Checkout** — Ensure the local branch matches the PR head. When needed:

   ```bash
   gh pr checkout {n} --repo {owner}/{repo}
   ```

## Phase 1 — Fetch

Read the minimum payload. Resolve head SHA first, then run all mandatory fetches
(threads, summaries, issue comments, REST orphan merge) before Phase 2.

### Step 0 — PR head SHA

```bash
gh pr view {n} --repo {owner}/{repo} --json headRefOid --jq .headRefOid
```

### Review threads

1. **GraphQL (primary)** — unresolved review threads (`isResolved == false`).
2. **Per-thread comment IDs** — paginate `comments(first: 100)` on each
   unresolved thread until exhausted; collect every comment `databaseId` for
   orphan dedupe (not only the first comment).

Capture per thread: `kind: thread`, `threadId` (`PRRT_...`), `path`, `line`,
first comment body, author login.

#### List unresolved threads

First page — **omit** `-f after` (GitHub rejects an empty `after` cursor):

```bash
gh api graphql -f query='
  query($owner: String!, $name: String!, $number: Int!, $after: String) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        reviewThreads(first: 100, after: $after) {
          pageInfo { endCursor hasNextPage }
          nodes {
            id
            isResolved
            path
            line
            comments(first: 100) {
              pageInfo { hasNextPage endCursor }
              nodes { databaseId id body author { login } }
            }
          }
        }
      }
    }
  }' -f owner=OWNER -f name=REPO -F number=PR \
  --jq '{
    pageInfo: .data.repository.pullRequest.reviewThreads.pageInfo,
    nodes: [
      .data.repository.pullRequest.reviewThreads.nodes[]
      | select(.isResolved==false)
      | {kind: "thread", id, path, line,
         author: .comments.nodes[0].author.login,
         body: .comments.nodes[0].body[0:200],
         comment_ids: [.comments.nodes[].databaseId]}
    ]
  }'
```

Paginate thread `comments` when `comments.pageInfo.hasNextPage` is `true`
(pass `after` on the thread’s comments connection). Accumulate all
`databaseId` values into `thread_comment_ids` for orphan dedupe.

Later pages — pass `-f after="$CURSOR"` where `$CURSOR` is
`pageInfo.endCursor` from the prior response. Keep `pageInfo` in the jq
output so pagination can continue after filtering unresolved nodes.

Paginate while `pageInfo.hasNextPage` is `true` — do not gate on unresolved
count. Each page returns up to 100 threads (resolved and unresolved mixed);
filter unresolved per page and accumulate results. Stop when `hasNextPage` is
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
# First page: omit -f after. Later pages: -f after="$CURSOR" from pageInfo.endCursor.
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
  }' -f owner=OWNER -f name=REPO -F number=PR \
  | jq --arg head "$HEAD" '{
      pageInfo: .data.repository.pullRequest.reviews.pageInfo,
      nodes: [
        .data.repository.pullRequest.reviews.nodes[]
        | select(.author.login == "copilot-pull-request-reviewer[bot]")
        | select(.body != null and .body != "")
        | select(.comments.totalCount == 0)
        | select(.commit.oid == $head)
        | {kind: "review_summary", review_id: .databaseId, node_id: .id,
           body: .body[0:500], submitted_at: .submittedAt, commit_id: .commit.oid}
      ]
    }'
```

Paginate reviews while `pageInfo.hasNextPage` is `true`, passing
`pageInfo.endCursor` as `$after` on later pages only. Stop when `hasNextPage`
is `false`.

### PR issue comments (idempotency + conversation comments)

Run **once** with pagination:

```bash
gh api --paginate repos/{owner}/{repo}/issues/{n}/comments
```

**Review summary idempotency:** skip any summary whose `databaseId` appears in
a comment posted after `submittedAt` with body containing
`Re: Copilot review (` and that id.

**Conversation comment triage:** from the same payload, emit
`kind: conversation_comment` rows when:

- `user.login` ends with `[bot]` and body is non-empty actionable review text.
- **Denylist** (skip): `dependabot[bot]`, `renovate[bot]`, `github-actions[bot]`,
  `codecov[bot]`, `sonarcloud[bot]` (extend when CI noise appears).
- Skip bodies that are acknowledgments (`Re: Copilot review (` or
  `Re: PR comment (`).
- **Conversation idempotency:** skip when a later comment after `created_at`
  contains `Re: PR comment (` and this comment’s `id` (`databaseId`).

Capture per row: `kind: conversation_comment`, `comment_id` (`databaseId`),
`author`, `body` (truncated), `created_at`.

### Orphan inline (REST merge)

MUST paginate inline review comments:

```bash
gh api --paginate repos/{owner}/{repo}/pulls/{n}/comments
```

1. Drop REST comments whose `id` is in `thread_comment_ids` from GraphQL.
2. For each remaining candidate, resolve the comment node and thread (GraphQL
   `node(id: PRRC_...)` with `pullRequestReviewThread { id isResolved }`).
3. If `pullRequestReviewThread.isResolved == true` → drop.
4. If unresolved `pullRequestReviewThread.id` → **promote** to `kind: thread`
   (use `threadId` in triage; do not leave as `orphan_inline`).
5. Remaining in-scope candidates (inline `Copilot` or review-bot logins
   consistent with inline rules) → `kind: orphan_inline` with `comment_id`,
   `path`, `line`, `author`, `body`.

### Review summaries — idempotency note

Summary and conversation idempotency both use the single issue-comment
pagination above; do not run a second fetch only for summaries.

## Phase 2 — Triage

Write a triage table **before** editing files:

| Kind | Path | Line | Author | Outcome | Rationale |
| --- | --- | --- | --- | --- | --- |
| `thread` | `src/foo.ts` | 42 | `Copilot` | `needs_fix` | ... |
| `review_summary` | — | — | `copilot-pull-request-reviewer[bot]` | `acknowledged` | clean review |
| `conversation_comment` | — | — | `cursor[bot]` | `needs_fix` | ... |
| `orphan_inline` | `src/bar.ts` | 10 | `Copilot` | `needs_fix` | ... |

| Outcome | Applies to | Action |
| --- | --- | --- |
| `needs_fix` | all kinds | Code or doc change required |
| `fixed_remote` | all kinds | Already on branch; resolve or acknowledge citing SHA |
| `wont_fix` | all kinds | Reply with rationale; no code change |
| `by_design` | all kinds | Reply citing policy or docs |
| `duplicate` | all kinds | Reply linking to resolving thread, summary, or comment |
| `acknowledged` | `review_summary`, `conversation_comment` | Reply noting clean or addressed; no code change |

One Phase 5 reply per `review_summary` and per `conversation_comment` row;
split multiple findings into rationale bullets, not separate replies.

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
regardless of `dry-run`. Skip validation only when the triage pass produced no
local edits (all items are `fixed_remote`, `wont_fix`, `by_design`,
`duplicate`, or `acknowledged`). When validation fails, fix issues before
handoff or commit.

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

Run when ship-mode is enabled (`dry-run` is false) and `gh` auth preflight
passed. MUST commit and push before Phase 5 when Phase 3 produced local edits.

- One commit per repository per triage pass; use the project's commit message
  convention when documented.
- Push the feature branch; capture commit SHA for Phase 5.
- **Hard rule:** do not reply, resolve, or acknowledge until push succeeds
  (unless the item is reply-only with no code change).
- When push fails (permissions, branch protection), report the failure and do
  not resolve threads citing a non-existent SHA.

## Phase 5 — Reply and close

MUST run when ship-mode is enabled. After push (or when no push is needed).
Branch by `kind` from the triage table.

### Review threads

Per thread, run **two sequential** GraphQL mutations — do not combine in one
call:

1. `addPullRequestReviewThreadReply`
2. `resolveReviewThread`

#### Reply to a thread

Write the reply body to a temp file first (never interpolate review text into
shell-quoted `-f body=`):

```bash
# REPLY_FILE contains the final reply text (written by the agent/tools)
jq -n --rawfile body "$REPLY_FILE" --arg threadId "PRRT_..." \
  --arg q 'mutation($threadId: ID!, $body: String!) {
    addPullRequestReviewThreadReply(input: {
      pullRequestReviewThreadId: $threadId
      body: $body
    }) { comment { id } }
  }' \
  '{query: $q, variables: {threadId: $threadId, body: $body}}' \
| gh api graphql --input -
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

Do not use REST `pulls/comments/{id}/replies` for thread closure when
`PRRT_...` is known. Use GraphQL thread IDs (`PRRT_...`).

### Review summaries

Acknowledge on the PR conversation (no resolve API). Write the acknowledgment
to a file, then:

```bash
gh pr comment {n} --repo {owner}/{repo} --body-file "$REPLY_FILE"
```

Example acknowledgment text (contents of `$REPLY_FILE`, not an inline shell
string):

`Re: Copilot review (${databaseId}): Fixed in {sha}: {summary}.`

Use the review `databaseId` from Phase 1. **Never** call `resolveReviewThread`
for summaries.

### Conversation comments

Acknowledge on the PR conversation (no resolve API). Write the acknowledgment
to a file, then:

```bash
gh pr comment {n} --repo {owner}/{repo} --body-file "$REPLY_FILE"
```

Example text:

`Re: PR comment (${comment_id}): Fixed in {sha}: {summary}.`

Use the issue comment `databaseId` from Phase 1. **Never** call
`resolveReviewThread` for conversation comments.

### Orphan inline

1. If the row was promoted to `thread` during fetch, use the **Review threads**
   path above.
2. Otherwise, write the reply to a file and post an inline reply (REST fallback
   only when `PRRT_...` is unknown):

```bash
gh api -X POST repos/{owner}/{repo}/pulls/{n}/comments/{comment_id}/replies \
  --input "$REPLY_FILE"
```

(`$REPLY_FILE` as JSON `{"body":"..."}` or use project-documented body format.)

Do not call `resolveReviewThread` without a `PRRT_...` id. Note in handoff
when an orphan could not be resolved.

### Reply templates

Threads, summaries, and conversation comments share outcome wording.
Summaries use `Re: Copilot review (${databaseId}):`; conversation comments use
`Re: PR comment (${comment_id}):`.

- Fixed: `Fixed in {sha}: {summary}.`
- Won't fix: `Intentional: {rationale}.`
- By design: `By design: {policy reference}.`
- Already fixed: `Addressed in {earlier_sha}: {summary}.`
- Acknowledged (summaries / conversation): `Review noted — no changes required.`
  or outcome-specific text.

Verify unresolved thread count is `0`, every in-scope review summary is
acknowledged, every in-scope conversation comment is acknowledged, and every
`orphan_inline` row is replied (and resolved when promoted to `thread`) before
handoff.

## Multi-repo orchestration

Per repository: `fix → validate → commit → push → threads, summaries, and
conversation items`.

- Use `cd` to each repo root or `gh --repo owner/name` consistently.
- Verify local branch matches PR head before fixing.
- Do not batch-resolve threads or acknowledge summaries before that
  repository's push lands.

## Known limitations

- Hybrid reviews (summary body plus inline comments) triage inline via threads
  only; summary body is skipped when `comments.totalCount > 0`.
- Summary and conversation acknowledgment is a timeline comment, not threaded
  under the review UI card.
- Re-acknowledgment is prevented by the Phase 1 idempotency heuristic, not a
  GitHub native state.
- Human conversation chatter and human-authored review summaries are out of
  scope. Non-Copilot review summary objects on the reviews API remain out of
  scope unless the same feedback appears as a bot conversation comment.
- Conversation comments cannot be marked resolved in the GitHub UI; ack-only.
- True `orphan_inline` rows without `PRRT_...` may remain unresolved on the
  Files changed tab after REST reply.

## Checklist

```text
- [ ] gh auth preflight passed
- [ ] Ship-mode enabled when dry-run is false (default)
- [ ] PR head SHA resolved
- [ ] Fetch unresolved threads (GraphQL, paginated; per-thread comment IDs)
- [ ] Fetch head-scoped Copilot summaries (zero inline, not already acknowledged)
- [ ] Fetch bot conversation comments (same issue-comment pagination; not skipped)
- [ ] Fetch REST inline and merge orphans (promote to thread when possible)
- [ ] Triage table written (Kind column)
- [ ] Fixes applied
- [ ] Validation passed when fixes were applied (project-appropriate)
- [ ] Committed and pushed (mandatory when ship-mode and local edits exist)
- [ ] Threads replied and resolved; summaries and conversation comments acknowledged
- [ ] Orphan inline rows closed out (mandatory when ship-mode)
- [ ] Handoff summary (PR, SHA, thread/summary/conversation counts)
```

## Handoff summary

| PR | Repo | Commit | Threads resolved | Summaries acknowledged | Conversation acknowledged | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| #n | owner/repo | `abc1234` | 8/8 | 1/1 | 2/2 | all in-scope feedback addressed |
