---
name: audit-agent-skills
description: >-
  Native host skill security audit, optional CLI appendix merge, consent,
  then remediation plan. Read-only; does not implement fixes.
version: 1.0.0
license: MIT
agents:
  - skill-security-analyst
  - skill-security-advisor
inputs:
  - name: planning-consent
    type: boolean
    description: Optional prior consent to run remediation planning.
  - name: user-clarifications
    type: string
    description: Optional user answers accumulated across clarification loops.
outputs:
  - name: security-report
    type: string
    description: Markdown security report from skill-security-analyst.
  - name: remediation-plan
    type: string
    description: Markdown plan; empty if the user declined planning.
  - name: open-questions
    type: string
    description: >-
      Remaining blockers or follow-ups at handoff; copy from advisor
      blocking-questions when present.
---

# Overview

Workspace entry for this package. Run the **native** host skill security
audit, optionally merge **supplementary** output from local CLIs when
installed, present the report, **ask before remediation planning**, then
draft a prioritized plan. Read-only. Does not include `skill-security-chat`.

```text
analyze → optional CLI appendix → present report → ask consent → plan → handoff
```

## Steps

1. **Analyze** — Invoke `skill-security-analyst` with optional
   `user-clarifications`. Capture `security-report`.

2. **Optional CLI enrich** — When host shell is available, MAY run
   supplementary scans and append an **Optional CLI appendix** to the
   report text shown to the user (still labeled native-first):
   - Prefer npm **`@ondrej-merkun/skill-audit`** when `npx
     @ondrej-merkun/skill-audit` or a clearly matching `skill-audit`
     binary is on PATH
   - Or PyPI **`skill-auditor`** when that CLI is on PATH
   - Merge findings by deduping on `path:rule` or equivalent; take the
     higher severity when both native and CLI flag the same item
   - If CLIs are missing or fail, keep the native report only. Do not
     delegate the audit to CLIs or replace the native rubric with CLI
     rules.

3. **Present** — Show the native `security-report` (with optional CLI
   appendix if step 2 ran) to the user.

4. **Consent** — If `planning-consent` is not true, ask whether to
   proceed to remediation planning. If the user declines, hand off the
   report, leave `remediation-plan` empty, and stop.

5. **Plan** — Invoke `skill-security-advisor` with `security-report`
   (native body; appendix is context only), `planning-consent` true, and
   `user-clarifications`. If `blocking-questions` is non-empty, ask the
   user, append answers to `user-clarifications`, and repeat this step
   (max **three** Q&A cycles). After the last cycle (or when none
   remain), copy leftover `blocking-questions` into `open-questions`
   (empty when none).

6. **Handoff** — Present `security-report`, `remediation-plan`, and
   `open-questions`. State that **implementing** remediations requires a
   different agent or an explicit user request. This package does not
   apply fixes.

## Error Handling

- **Unreadable or empty skill trees:** Report that and stop. Do not
  invent skills.
- **User declines planning:** Return the report, empty `remediation-plan`.
- **Advisor invoked without a report:** Ask the user to run this flow
  (or `skill-security-analyst`) first.
- **Same blockers after three Q&A cycles:** Stop looping, copy them into
  `open-questions`, and surface them at handoff.
- **User asks to implement fixes:** Refuse in this flow unless they use
  another agent with an explicit implementation request.
- **User asks to run `skill-security-chat`:** Tell them chat-web is a
  separate entry. Do not call that agent from this flow.

## Interaction Contract

**Input:** optional `planning-consent`, optional `user-clarifications`.

**Output:** `security-report`, `remediation-plan` (empty if declined),
and `open-questions`.

When the host IDE provides a planning-only mode, use it for these steps.
MUST NOT start implementing remediations unless the user explicitly
requests execution with another agent.
