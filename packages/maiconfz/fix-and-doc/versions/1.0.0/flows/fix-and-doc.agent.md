---
name: fix-and-doc
description: >-
  Understand one reported bug, fix that instance, then record a short
  lesson so later changes avoid the same mistake.
version: 1.0.0
license: MIT
agents:
  - bug-fixer
  - pitfall-recorder
inputs:
  - name: bug-report
    type: string
    description: >-
      Unstructured bug report (sentence, failing case, review comment,
      stack trace, or tool finding).
  - name: lesson-path
    type: string
    description: >-
      Optional relative path to the pitfalls guide. When omitted,
      pitfall-recorder discovers or creates the guide.
outputs:
  - name: fix-summary
    type: string
    description: Output from bug-fixer.
  - name: blocking-questions
    type: string
    description: Output from bug-fixer; empty when the fix step completed.
  - name: lesson-path
    type: string
    description: Path of the file that received the lesson.
  - name: lesson-id
    type: string
    description: Stable slug of the lesson section.
---

# Overview

Workspace entry for fix-then-document. Invoke `bug-fixer` with the
user's report, then `pitfall-recorder` when `blocking-questions` is
empty and the fixer produced a concrete `fix-summary`. Does not commit or
push. Complements `maiconfz/review-fix-ship`, which reviews diffs and
ships; this flow targets one repeatable mistake and records it for
later work.

```text
bug-report → bug-fixer → fix-summary → pitfall-recorder → lesson
```

## Steps

1. **Preflight** — Confirm a workspace with product source (not the
   registry package tree alone). If `bug-report` is empty, ask the user
   once and stop.
2. **Fix** — Invoke `bug-fixer` with `bug-report`. If
   `blocking-questions` is non-empty, return `blocking-questions` and
   any partial `fix-summary` to the user and stop. Do not invoke
   `pitfall-recorder`.
3. **Record** — Invoke `pitfall-recorder` with `bug-report`,
   `fix-summary`, and optional `lesson-path` from the flow input.
4. **Handoff** — Return `fix-summary`, `blocking-questions` (empty when
   none), `lesson-path`, and `lesson-id`. Note that host-repo edits
   remain uncommitted unless the user runs another workflow.

## Error Handling

- **Ambiguous fix:** when `blocking-questions` is non-empty, propagate it
  and skip documentation. Do not guess a file path.
- **Recorder failure:** when the lesson file cannot be written, return
  `fix-summary` with the write failure reason appended, and leave
  `lesson-path` and `lesson-id` empty. Do not commit to recover.
- **No code change:** when `fix-summary` states nothing to fix, still
  run `pitfall-recorder` if the mistake is worth documenting; omit
  code-change claims from the lesson.
- **Scope:** this flow does not run full-repo review, add lint rules,
  or add tests unless the user requests that separately.

## Interaction Contract

**Input:** `bug-report`; optional `lesson-path`.

**Output:** `fix-summary`, `blocking-questions`, `lesson-path`, `lesson-id`.
