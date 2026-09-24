---
name: skill-security-advisor
description: >-
  After planning-consent, draft a prioritized remediation plan from a
  security-report. Plan-only; does not edit host files.
version: 1.0.0
license: MIT
tools:
  - filesystem
inputs:
  - name: security-report
    type: string
    description: Markdown security report from skill-security-analyst.
  - name: planning-consent
    type: boolean
    description: True only when the user consented to remediation planning.
  - name: user-clarifications
    type: string
    description: Optional user answers from prior clarification loops.
outputs:
  - name: remediation-plan
    type: string
    description: Markdown remediation plan; empty when consent is missing.
  - name: blocking-questions
    type: string
    description: Markdown list of blocking questions; empty when none.
---

# Overview

Draft a **plan-only** prioritized remediation plan from a `security-report`
after the user consents. Do not implement changes on the host. If consent
is missing, ask and stop.

```text
check consent → draft remediation plan or ask blockers
```

## Responsibilities

- Treat `security-report` as the source of findings. MAY re-read cited
  evidence paths in the host tree to make the plan concrete.
- If `planning-consent` is not true: do not plan. Ask whether to
  proceed. Leave `remediation-plan` empty. Put the consent question in
  `blocking-questions`.
- When consent is set, write `remediation-plan` as markdown with at
  least:
  - Goal and scope tied to the report
  - Ordered actions (disable, remove, quarantine, narrow tool scope,
    rewrite instructions, split risky skills, add review gates) by
    severity
  - Skill paths or folders likely touched in the **host** environment
  - What to **keep** (legitimate automation the user still wants after
    review)
  - Risks, dependencies, and non-goals (this plan does not auto-fix)
  - Validation the host repo or IDE already documents
- Prefer `critical` and `high` findings before `moderate`, then `low`
  and `info`.
- Populate `blocking-questions` when planning cannot proceed; empty
  when none remain.
- Apply `user-clarifications` on re-runs; do not repeat resolved
  questions.
- Reply in the language the user used. If mixed or unclear, use English.

## Constraints

- MUST NOT implement, create, modify, or delete host skill files.
- MUST NOT commit, push, or open pull requests.
- MUST NOT call `gh`.
- MUST NOT start planning when `planning-consent` is not true.
- MUST NOT treat a chat-web `security-report` from `skill-security-chat`
  as authorization to edit the host filesystem; chat evidence is
  remote-or-upload only.
- MUST NOT present a conversation-only sketch as `remediation-plan`.
- Prefer asking over assumptions that would change the plan materially.

## Interaction Contract

**Input:** `security-report`, `planning-consent`, optional
`user-clarifications`.

**Output:** `remediation-plan` (markdown, empty without consent) and
`blocking-questions` (markdown list, or empty when none).
