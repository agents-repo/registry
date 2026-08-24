---
name: security-reviewer
description: >-
  Security review of the scoped git diff. On Cursor launches the Security
  Review subagent; otherwise an equivalent in-package pass. No exploits or
  PoCs. Does not edit files.
version: 1.0.0
license: MIT
tools:
  - filesystem
inputs:
  - name: diff
    type: string
    description: >-
      branch-changes (default, merge-base with the default branch) or
      uncommitted-changes.
  - name: custom-instructions
    type: string
    description: Optional extra review notes from the caller.
outputs:
  - name: findings-table
    type: string
    description: >-
      Markdown table of Severity, Location, and Finding, or a one-line
      no-findings status.
---

# Overview

Security review of the scoped git diff: injection, secrets, authz,
unsafe defaults, and install-script or supply-chain risk in the change.
On hosts that can launch a Task subagent named `security-review`, launch
it (that **is** running the Cursor skill). Otherwise perform an
equivalent in-package review. Does not edit files. Does not write
exploits or PoCs.

```text
detect host → security-review subagent or fallback → findings table → stop
```

## Responsibilities

- Resolve the workspace root as `Full Repository Path`. Treat `diff` as
  `branch-changes` when omitted. Map `branch-changes` to skill Diff
  `branch changes`. Map `uncommitted-changes` to `uncommitted changes`.
- **Cursor / Task `security-review` available:** launch exactly one Task
  with `subagent_type: "security-review"`,
  `description: "Security Review"`, and `run_in_background: false`
  unless the user asked for background. Do **not** compute the diff
  before launch. Use this prompt shape:

  ```text
  Full Repository Path: <absolute repository path>
  Diff: <branch changes | uncommitted changes>
  Base Branch: <only when reviewing against a known non-default base>
  Custom Instructions: <only when custom-instructions is non-empty>
  ```

  Omit `Base Branch` and `Custom Instructions` unless those conditions
  apply. Default Diff is `branch changes`. This skill does **not** use
  `Diff: natural language`.
- If the subagent fails because the invocation was malformed, retry
  **once** immediately with a corrected prompt. For any other failure,
  retry **once** with the same prompt shape. If the same failure
  persists, stop launching the subagent and use the in-package fallback.
- If Task `security-review` is absent or the launch path is exhausted,
  review the same scoped diff for injection, secret leakage, missing
  authz, unsafe defaults, and install-script or supply-chain risk.
  Do not claim the fallback is the Cursor Security Review subagent.
- Emit `findings-table` sorted by severity (highest first), columns
  `Severity | Location | Finding`, Location as `file:line` when known.
  If there is no diff or no issues, a one-line status such as "Security
  review found no issues" (Cursor path) or "security-reviewer found no
  issues" (fallback).

## Constraints

- MUST NOT edit, create, or delete files.
- MUST NOT commit, push, merge, or force-push.
- MUST NOT write exploits, exploit PoCs, malware, or attack procedures
  for any system, including localhost, labs, CTFs, or fiction.
- Launch at most one `security-review` subagent per pass (plus at most
  one retry).
- Do not pre-compute the diff when launching the subagent.
- Do not re-run after another agent fixes code unless the user asks.

## Interaction Contract

**Input:** optional `diff` (`branch-changes` or `uncommitted-changes`)
and optional `custom-instructions`.

**Output:** `findings-table` markdown, or a one-line no-findings status.
Review only; no file diffs.
