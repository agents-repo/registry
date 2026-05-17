# Agent Format Specification (1.0.0)

This document defines the deterministic format for agents
within a package.

## Normative Language

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY
are to be interpreted as described in RFC 2119.

## Schema Version Lifecycle

This specification defines agent file format and rules. It does not define
a JSON `schemaVersion` field.

| Version | Applies To | Status | Notes |
| --- | --- | --- | --- |
| `1.0.0` | spec document version | current | Initial entry |

Tooling and processes that validate agent format SHOULD use the latest
supported spec document version in this table.

## Required Files

Each agent `<agent-id>` MUST include:

- `agents/<agent-id>.agent.md`
- `agents/<agent-id>.metadata.json`

The `<agent-id>` stem MUST be identical for both files.

## Agent File Structure

`<agent-id>.agent.md` MUST start with YAML frontmatter followed by
markdown body content.

Frontmatter required fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `name` | string | MUST equal `<agent-id>` (stem before `.agent.md`) |
| `description` | string | 1 to 300 characters |
| `version` | string | Semantic version |
| `license` | string | MUST be `MIT` |

Frontmatter optional fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `tools` | array of string | Declared tool capabilities |
| `inputs` | array of `Contract` | Input contracts |
| `outputs` | array of `Contract` | Output contracts |

### Contract Object Schema

Each item in `inputs[]` and `outputs[]` MUST be an object with
exactly these fields:

| Field | Type | Constraints |
| --- | --- | --- |
| `name` | string | 1 to 64 characters; `^[a-z][a-z0-9_-]*$` |
| `type` | string | `string`, `number`, `boolean`, `object`, or `array` |
| `description` | string | 1 to 300 characters |

Additional `Contract` rules:

- `Contract` objects MUST NOT contain fields other than `name`, `type`,
  and `description`.
- Within `inputs[]`, each `name` MUST be unique.
- Within `outputs[]`, each `name` MUST be unique.
- Ordering of `inputs[]` and `outputs[]` is significant and MUST be
  preserved as authored.

Body sections required in order:

1. `# Overview`
2. `## Responsibilities`
3. `## Constraints`
4. `## Interaction Contract`

## Relationship Rules

- `<agent-id>.agent.md` frontmatter `name` MUST equal `<agent-id>`.
- `<agent-id>.agent.md` frontmatter `name` MUST equal
  `<agent-id>.metadata.json` `name`.
- `<agent-id>.agent.md` frontmatter `license` MUST equal `MIT`.
- When `description` is present in both frontmatter and
  `<agent-id>.metadata.json`, the values MUST be identical.
- When `tools` is present in both frontmatter and
  `<agent-id>.metadata.json`, the values MUST be identical.
- When `inputs` is present in both frontmatter and
  `<agent-id>.metadata.json`, the values MUST be identical.
- When `outputs` is present in both frontmatter and
  `<agent-id>.metadata.json`, the values MUST be identical.
- `<agent-id>.metadata.json` fields are defined in
  `metadata-schema.md`.
- For agent metadata `schemaVersion: "1.1.0"`,
  `<agent-id>.metadata.json` MUST include `status`, `category`, and
  `estimateCost`.
- For package root `agents/<agent-id>.agent.md`, frontmatter `version`
  MUST follow the root working-copy consistency rules defined in
  `versioning-rules.md`.

## ZIP Bundle Rules

- Each `versions/<version>/<version>.zip` is a deployment artifact
  for extraction into a project's `.github/` folder.
- Within `versions/<version>/<version>.zip`, each bundled
  `agents/*.agent.md` frontmatter `version` MUST equal `<version>`.
- Agent `<agent-id>.agent.md` files are placed as
  `agents/<agent-id>.agent.md` in the ZIP.
- Flow `<flow-id>.agent.md` files are also placed under `agents/`
  in the ZIP; Copilot reads both agents and flows as agent
  instructions.
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
