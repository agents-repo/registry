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

- Derive a stable `lesson-id` slug from the understood mistake (kebab-case).
- Choose the lesson file in this order:
  1. Caller-supplied `lesson-path` when set.
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
