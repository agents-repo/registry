# Fix & doc

Understand one reported bug, fix that instance, and record a short lesson in
the repo's existing pitfalls guide so the same mistake is not repeated.

Use this when a defect shows up again in new code — from a review comment,
a failing test, a stack trace, a static-analysis finding, or plain-language
description. The flow is **source-agnostic**: it does not require a specific
tool report format.

## What it does

1. **`bug-fixer`** — interprets your report, locates the code, applies a
   minimal fix for that instance.
2. **`pitfall-recorder`** — appends or extends a lesson about the **mistake**
   (not the tool that found it) in an existing pitfalls guide, or creates
   `docs/known-pitfalls.md`, and adds a short pointer in agent instructions
   when needed.

Invoke the **`fix-and-doc`** flow with a `bug-report` string. Optionally pass
`lesson-path` to force where the lesson lives.

## What it does not do

- Does **not** commit or push (use `maiconfz/review-fix-ship` to ship).
- Does **not** add tests, lint rules, or repo-wide sweeps.
- Does **not** replace PR or diff review workflows.

## Install

Install `maiconfz/fix-and-doc` with the agents-repo CLI into your project's
agent skill paths, then load the `fix-and-doc` flow.

## Example

Report: "We null-check the outer object but still read `.id` on a nested field
that can be undefined in `src/api/client.ts`."

The flow fixes that read, then records a lesson such as `nested-optional-chain`
under your pitfalls guide with Avoid / Prefer guidance for the next change.

## Package contents

| Asset | Role |
| --- | --- |
| `flows/fix-and-doc` | Orchestrates fix then record |
| `agents/bug-fixer` | Minimal fix for one instance |
| `agents/pitfall-recorder` | Lesson file and optional instruction pointer |

## Maintainer validation

From the registry repository root:

```bash
npm run package:validate -- --package maiconfz/fix-and-doc
npm run package:build -- --package maiconfz/fix-and-doc
npm run package:validate-artifacts -- --package maiconfz/fix-and-doc --version 1.0.0
```
