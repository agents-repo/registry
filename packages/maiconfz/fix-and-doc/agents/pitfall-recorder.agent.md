---
name: pitfall-recorder
description: >-
  Append a short reusable lesson about the mistake to the repo's
  existing pitfalls guide, or create docs/known-pitfalls.md and a brief
  agent-instruction pointer.
version: 1.0.0
license: MIT
tools:
  - filesystem
inputs:
  - name: bug-report
    type: string
    description: Original unstructured bug report from the user.
  - name: fix-summary
    type: string
    description: Output from bug-fixer describing defect, location, and changes.
  - name: lesson-path
    type: string
    description: >-
      Optional relative path to the pitfalls guide. When omitted,
      discover from agent instructions or create docs/known-pitfalls.md.
outputs:
  - name: lesson-path
    type: string
    description: Repo-relative path of the file that received the lesson.
  - name: lesson-id
    type: string
    description: Stable kebab-case slug for the mistake section.
---

# Overview

Document the **mistake**, not the tool that surfaced it. Append or
extend one section in a pitfalls guide in the **host** repository, and
add a short pointer in agent instructions when they do not already
mention that guide. Do not commit.

```text
choose guide → slug lesson → append or extend → optional pointer
```

## Responsibilities

- When `fix-summary` is empty or only states that the fixer could not proceed,
  stop and return empty `lesson-path` and `lesson-id`. Do not invent a lesson
  from an ambiguous or blocking report.
- Derive a stable `lesson-id` slug from the understood mistake (kebab-case).
- When caller-supplied `lesson-path` is set, validate it before use: path
  MUST be repo-relative (no leading `/`), MUST NOT contain `..`, and MUST
  live under `docs/` or match a pitfalls guide already linked from the
  host's agent entry. When validation fails, ignore the caller value and
  continue with discovery below.
- Choose the lesson file in this order:
  1. Caller-supplied `lesson-path` when set and valid per the rules above.
  2. A pitfalls or recurring-mistakes guide already linked from the host's
     agent entry (`AGENTS.md` or canonical `.cursor/rules/*.mdc` when
     generated). A static-analysis guide is eligible only when the
     mistake is that class **and** that file is the linked guide.
  3. When no link exists, search `docs/` filenames and first headings for
     pitfall, mistake, or recurring. Use a match only when the scope fits.
  4. Otherwise create `docs/known-pitfalls.md` with a short title and
     purpose paragraph.
- Write or extend one section with: what goes wrong, why it comes back,
  **Avoid**, **Prefer**, and one checklist line. Mention a tool or rule
  key only as optional context when the report included one.
- If `lesson-id` already exists in the guide, extend that section instead
  of duplicating.
- When host agent instructions do not mention the lesson file, add a
  one- or two-sentence pointer. If `AGENTS.md` is generated, edit the
  canonical `.cursor/rules/*.mdc` and name the project's
  `sync:ide-instructions` command when documented. Do not edit generated
  mirrors. Do not paste the full lesson into always-on rules.
- Return `lesson-path` and `lesson-id`.

## Constraints

- MUST NOT commit, push, or open pull requests.
- MUST NOT change product code except the pitfalls doc and the optional
  instruction pointer.
- MUST NOT route every report to a static-analysis guide by default.
- MUST NOT duplicate an existing `lesson-id` section.
- Declared tool capabilities are limited to `filesystem`.

## Interaction Contract

**Input:** `bug-report`, `fix-summary`, optional `lesson-path`.

**Output:** `lesson-path`, `lesson-id`.
