---
name: pr-comment-triage
description: >-
  Fetches PR review comments and threads, triages fix vs reply-only outcomes,
  applies code fixes, commits and pushes when requested, then replies and
  resolves threads via gh. Use when triaging PR review comments, addressing
  Copilot or Bugbot inline feedback, or closing review threads after fixes land.
---
# PR comment triage

Five-phase workflow for addressing pull request review feedback.

When babysitting a PR, run this skill for unresolved review threads before CI fixes.

## When to use

- User asks to triage, fix, or resolve PR review comments or threads
- Copilot, Bugbot, or human inline review feedback on an open PR
- Multi-repo batches (loop per repository)

## Prerequisites

- `gh` CLI authenticated
- Know `--repo owner/name` and PR number (or discover via `gh pr view` from branch)
- Checkout the PR head branch; never implement on `main`
- Agents-repo policy: do not merge, push to `main`, or mark PR ready — hand off after push

## Phase 1 — Fetch

Read the minimum payload. Filter resolved threads first.

1. **GraphQL (primary)** — unresolved review threads (`isResolved==false`)
2. **REST (secondary)** — inline review comments for extra context
3. **Optional** — `gh pr view {n} --repo {owner}/{repo} --comments`

Capture per thread: `threadId` (`PRRT_...`), `path`, `line`, first comment body, author.

Commands: see [reference.md](reference.md).

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

Validate Bugbot findings before marking `needs_fix`. Use `wont_fix` with rationale when disagreeing.

## Phase 3 — Fix

- Minimal scoped diffs; match surrounding conventions
- Batch fixes per repository when one PR spans multiple files
- Do **not** reply or resolve threads during this phase
- If fixes touch normative docs, run that repo's change-propagation rules before commit

## Phase 4 — Validate, commit, push

Run only when the user or task explicitly requests commit/push.

### Pre-commit-equivalent checks

| Repo | Commands |
| --- | --- |
| `.github` | Markdown spot-check (no husky) |
| `registry` | `npm run lint:all`; `npm run sync:cursor-rules -- --check` |
| `webapp` | `npm run lint:all`; `test:sync`; `sync:cursor-rules --check` |
| `registry-proxy` | `npm run lint:all`; `test:sync`; `sync:cursor-rules --check` |

When `copilot-instructions.md` changes, run `npm run sync:cursor-rules` (without `--check`) before commit.

Child repos with npm: run `corepack enable`, `npm ci`, `npm run env:check` when hooks are unavailable.

- One commit per repository per triage pass; use conventional commit prefixes per repo rules
- Push the feature branch; capture commit SHA for Phase 5
- **Hard rule:** do not reply or resolve until push succeeds

## Phase 5 — Reply and resolve

After push only. Per thread, run **two sequential** GraphQL mutations (do not combine):

1. `addPullRequestReviewThreadReply`
2. `resolveReviewThread`

Reply templates:

- Fixed: `Fixed in {sha}: {summary}.`
- Won't fix: `Intentional: {rationale}.`
- By design: `By design: {policy reference}.`
- Already fixed: `Addressed in {earlier_sha}: {summary}.`

Verify unresolved thread count is `0` per PR before handoff.

## Multi-repo orchestration

Per repository: `fix → validate → commit → push → threads`.

- Use `cd` to each repo root or `gh --repo owner/name` consistently
- Verify local branch matches PR head before fixing
- Do not batch-resolve threads before that repo's push lands
- When org `.github` and child repos change together, push `.github` first

## Checklist

```text
- [ ] Fetch unresolved threads (GraphQL primary)
- [ ] Triage table written
- [ ] Fixes applied
- [ ] Validation passed (hook-equivalent)
- [ ] Committed and pushed (if requested)
- [ ] Threads replied and resolved (post-push)
- [ ] Handoff summary (PR, SHA, resolved count)
```

## Handoff summary

| PR | Repo | Commit | Threads resolved | Notes |
| --- | --- | --- | --- | --- |
| #n | owner/repo | `abc1234` | 10/10 | all resolved |

## Maintenance

Canonical copy: `agents-repo/.github` → `.cursor/skills/pr-comment-triage/`.

After edits, copy `SKILL.md` and `reference.md` byte-identically to child repos.
Registry infra skills are preserved during package cursor sync (see `ide-targets.ts`).
