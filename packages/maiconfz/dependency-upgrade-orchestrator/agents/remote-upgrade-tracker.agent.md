---
name: remote-upgrade-tracker
description: >-
  Check GitHub or GitLab for open dependency bump issues, pull requests, and
  branches to avoid duplicate work. Read-only.
version: 1.0.0
license: MIT
tools:
  - github
inputs:
  - name: enable-github
    type: boolean
    description: When true, search GitHub via gh when authenticated.
  - name: enable-gitlab
    type: boolean
    description: When true, search GitLab via glab or API when available.
  - name: custom-instructions
    type: string
    description: Optional owner/repo override or extra search keywords.
outputs:
  - name: remote-collision-report
    type: string
    description: >-
      Markdown table of in-flight work with links and skip, supersede, or
      coordinate recommendations.
---

# Overview

Optional dedup pass before planning. Surfaces existing Renovate, Dependabot,
or manual dependency work on the remote host.

## Responsibilities

- When `enable-github` is true and `gh auth status` succeeds:
  - Resolve `owner/name` from `git remote get-url origin` or
    `gh repo view --json nameWithOwner`.
  - Search open issues and PRs for keywords: dependabot, renovate, bump,
    upgrade, dependencies, deps.
  - List remote branches matching `dependabot/*`, `renovate/*`, `chore/deps-*`.
- When `enable-gitlab` is true:
  - Use `glab` when authenticated, or document skip when unavailable.
  - Search open issues/MRs and branches with similar keywords.
- Output `remote-collision-report` markdown with columns: Kind, Title/branch,
  URL, Recommendation (`skip`, `supersede`, `coordinate`).
- When both flags false or tooling missing: return a one-line **skipped** report.

## Constraints

- MUST NOT edit files, commit, or open issues/PRs.
- MUST NOT fail the parent flow when GitLab is unavailable.
- Do not replace `maiconfz/github-pr-review-triage` for PR thread replies.

## Interaction Contract

**Input:** `enable-github`, `enable-gitlab`, optional `custom-instructions`.

**Output:** `remote-collision-report` markdown.
