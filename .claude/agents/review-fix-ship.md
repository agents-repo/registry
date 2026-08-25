---
name: review-fix-ship
description: >-
  Runs code, bug, and security reviews (Cursor skills when available), merges
  findings, then fixes, commits, and pushes. Complements GitHub PR thread
  triage.
version: 1.0.0
agents:
  - code-reviewer
  - bug-reviewer
  - security-reviewer
  - findings-fixer
inputs:
  - name: dry-run
    type: boolean
    description: >-
      When true, review, triage, fix, and validate only — no commit or push.
      Defaults to false (full automation).
  - name: diff
    type: string
    description: >-
      branch-changes (default, merge-base with the default branch) or
      uncommitted-changes.
  - name: custom-instructions
    type: string
    description: Optional extra review notes passed to each reviewer.
outputs:
  - name: findings-table
    type: string
    description: 'Merged Severity, Source, Location, Finding table after the three reviews.'
  - name: handoff-summary
    type: string
    description: 'Branch, commit SHA when pushed, what shipped or why ship was skipped.'
---
# Overview

Workspace entry for local diff review then ship. Runs `code-reviewer`,
`bug-reviewer`, and `security-reviewer`, merges findings, then invokes
`findings-fixer`. On Cursor, bug and security passes launch official
Task subagents when the host can. Complements GitHub PR thread triage
(`maiconfz/github-pr-review-triage`); this flow does not reply on PRs.

Invoking this flow grants ship-mode on the current **feature branch**
when `dry-run` is omitted or `false`. That overrides generic "do not
commit unless requested" rules for this pass. Default-branch push,
merge, and mark-ready remain forbidden.

```text
preflight → code + bug + security → merge → fix → validate/commit/push
```

## Steps

1. **Preflight** — Confirm a git workspace. If HEAD is detached, stop.
   If the current branch is the default branch, stop and ask the user
   to switch to a feature branch. Do not create a branch. Treat `diff`
   as `branch-changes` when omitted. Enable ship-mode when `dry-run` is
   omitted or `false`.
2. **Reviews** — Invoke `code-reviewer`, `bug-reviewer`, and
   `security-reviewer` with the same `diff` and `custom-instructions`.
   Run them in parallel when the host allows concurrent agents;
   otherwise sequential. Review agents MUST NOT edit files.
3. **Merge** — Combine the three `findings-table` outputs into one
   table with columns `Severity | Source | Location | Finding`. Source
   is the agent id. Deduplicate: if two sources flag the same path and
   issue, keep the specialist row (`bug-reviewer` or `security-reviewer`
   beats `code-reviewer`). Drop empty no-findings status lines from the
   merged table.
4. **Fix and ship** — If the merged table has no findings, emit a
   one-line status, leave `handoff-summary` noting no commit, and stop.
   Otherwise invoke `findings-fixer` with the merged table, `dry-run`,
   `diff`, and `custom-instructions`. Return its `handoff-summary`.
   Do not re-run the three reviewers unless the user asks.

## Error Handling

- **Not a git repository:** stop. Do not invent a workspace.
- **Detached HEAD:** stop. Ask for a named feature branch.
- **Checkout is the default branch:** stop. Do not create a branch and
  do not push `main` or `master`.
- **One reviewer fails:** keep the other reports, say which source is
  missing, and continue to merge if any findings exist. If all three
  fail, stop without calling `findings-fixer`.
- **Cursor subagent fails after retry:** the specialist agent falls
  back to its in-package review. Do not fail the flow for that alone.
- **Validation fails:** `findings-fixer` MUST NOT commit. Surface the
  failure in `handoff-summary`.
- **No remote or push denied:** report the failure. Do not claim
  shipped. Do not force-push.
- **Empty findings:** no commit, no push.
- **User asks for GitHub thread reply/resolve:** do not do that here.
  Point them at `maiconfz/github-pr-review-triage`.
- **Safety floor:** never write exploits or PoCs, never commit secrets,
  never skip hooks, never merge PRs, never mark a PR ready.

## Interaction Contract

**Input:** optional `dry-run` (defaults to `false`), optional `diff`
(`branch-changes` or `uncommitted-changes`), optional
`custom-instructions`.

**Output:** merged `findings-table` and `handoff-summary`.
