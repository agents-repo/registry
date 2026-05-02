# Agent Format Specification (v0.1)

This document defines the deterministic format for agents
within a package.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Required Files

Each agent `<agent-id>` MUST include:

- `agents/<agent-id>.md`
- `agents/<agent-id>.metadata.json`

The stem `<agent-id>` MUST be identical for both files.

## Agent File Structure

`<agent-id>.md` MUST start with YAML frontmatter followed by
markdown body content.

Frontmatter required fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `name` | string | MUST match `<agent-id>` stem |
| `description` | string | 1 to 300 characters |
| `version` | string | Semantic version |
| `license` | string | SPDX identifier |

Frontmatter optional fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `tools` | array of string | Declared tool capabilities |
| `inputs` | array of object | Input contracts |
| `outputs` | array of object | Output contracts |

Body sections required in order:

1. `# Overview`
2. `## Responsibilities`
3. `## Constraints`
4. `## Interaction Contract`

## Relationship Rules

- `<agent-id>.md` frontmatter `name` MUST match the file stem.
- `<agent-id>.md` frontmatter `name` MUST equal
  `<agent-id>.metadata.json` `name`.
- `<agent-id>.metadata.json` fields are defined in
  `metadata-schema.md`.

## ZIP Bundle Rules

- Each `versions/<version>.zip` is a deployment artifact for
  extraction into a project's `.github/` folder.
- Agent `.md` files are placed as `agents/<agent-id>.md` in the ZIP.
- Flow `.md` files are also placed under `agents/` in the ZIP;
  Copilot reads both agents and flows as agent instructions.
- `agents/<agent-id>.metadata.json` files MUST NOT be included.
- ZIP content file names MUST match exact case.

## Canonical Example

```markdown
---
name: planner
description: Plans the steps to complete a PR review task.
version: 1.0.0
license: MIT
tools:

    - github
    - filesystem
---

# Overview

Plan and sequence PR review steps for downstream agents.

## Responsibilities

- Analyse PR diff and comment threads.
- Produce an ordered action plan.
- Delegate tasks to executor agents.

## Constraints

- Do not mutate files unless explicitly requested.
- Preserve user intent and repository conventions.

## Interaction Contract

Input: pull request URL or local review context.
Output: ordered action plan with delegated task assignments.
```
