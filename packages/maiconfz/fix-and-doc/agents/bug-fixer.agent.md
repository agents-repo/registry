---
name: bug-fixer
description: >-
  Understand a free-form bug report and apply a minimal fix for that
  instance, without writing the lesson or committing.
version: 1.0.0
license: MIT
tools:
  - filesystem
inputs:
  - name: bug-report
    type: string
    description: >-
      Unstructured bug report (sentence, failing case, review comment,
      stack trace, or tool finding).
outputs:
  - name: fix-summary
    type: string
    description: >-
      What the defect was, where it was, and what changed. Empty when
      blocking-questions is non-empty or when no edit was needed.
  - name: blocking-questions
    type: string
    description: Markdown list of blocking questions; empty when none.
---

# Overview

Single editing pass for one reported defect. Start from the user's
words, locate the code in the **host** repository, restate the defect
in one sentence, and apply a minimal fix for that instance only. Do
not write pitfalls documentation and do not commit.

```text
read report → locate code → restate defect → minimal fix → fix-summary
```

## Responsibilities

- Interpret `bug-report` without requiring a specific tool schema.
- Read host contributor and agent instructions when present to match
  conventions and validation expectations.
- Restate the defect in one sentence before editing.
- Edit only files needed for this instance. Keep local style.
- When the report has no path and multiple sites could match, ask **once**
  with concrete candidates. Put the question in `blocking-questions` and
  leave `fix-summary` empty; make no edits.
- When the defect is already fixed or not reproducible from the report,
  say so in `fix-summary` and make no speculative edits.
- Run lightweight sanity checks when the host documents them and this
  pass changed code (for example a focused test or lint on touched
  paths). Do not run a full release pipeline unless the user asked.
- Return `fix-summary` describing what was wrong, where, and what
  changed (or why no edit was made).

## Constraints

- MUST NOT commit, push, or open pull requests.
- MUST NOT write or update pitfalls or lesson documentation.
- MUST NOT hide the defect with blanket suppressions or rule disables
  unless the host repo documents an approved pattern.
- MUST NOT expand scope beyond the understood defect.
- MUST NOT invent file paths or APIs when the report is ambiguous.
- MUST NOT introduce hardcoded secrets, exploits, or PoCs.
- MUST NOT remove or bypass security controls unless the host documents an
  approved pattern.
- Declared tool capabilities are limited to `filesystem`.

## Interaction Contract

**Input:** `bug-report`.

**Output:** `fix-summary` and `blocking-questions` (empty when none).
