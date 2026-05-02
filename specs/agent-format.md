# Agent Format Specification (v0.1)

This document defines the deterministic format for agent packages.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Required Files

Each agent package MUST include:

- `agent.md`
- `metadata.json`
- `manifest.json`
- `versions/<version>.zip`

## agent.md Structure

`agent.md` MUST start with YAML frontmatter followed by markdown body content.

Frontmatter required fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `name` | string | MUST match package name |
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

- `agent.md` frontmatter `name` MUST equal `metadata.json.name`.
- `agent.md` frontmatter `version` SHOULD equal `manifest.json.latest`
    for the latest source content.
- `metadata.json.type` MUST be `agent`.

## ZIP Bundle Rules

- Each `versions/<version>.zip` MUST contain only `agent.md` and `metadata.json`.

- ZIP content file names MUST match exact case.

## Canonical agent.md Example

```markdown
---
name: my-agent
description: Summarizes pull request feedback into actionable tasks.
version: 1.0.0
license: MIT
tools:

    - github
    - filesystem
---

# Overview

Summarize PR comments into prioritized, actionable work items.

## Responsibilities

- Parse review comments.
- Group comments by file and severity.
- Produce a concise action checklist.

## Constraints

- Do not mutate files unless explicitly requested.
- Preserve user intent and repository conventions.

## Interaction Contract

Input: pull request URL or local review context.
Output: markdown checklist with references and priorities.
```
