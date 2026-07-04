---
name: full-package-creation-flow
description: Orchestrates package creation through script-driven scaffold,
  authoring, validation, build, and artifact gate stages.
version: 1.0.0
license: MIT
agents:
  - package-requirements-analyst
  - package-creator
  - package-submission-reviewer
  - package-script-runner
  - package-release-gate
inputs:
  - name: user-intent
    type: string
    description: A free-form description of what the user wants
      the package to do or contain.
outputs:
  - name: release-gated-package-source
    type: object
    description: The fully authored, reviewed, validated, built,
      and artifact-gated package source tree.
---

# Overview

Coordinate the full cycle of creating a new registry package
from user intent to an artifact-gated build result.
The flow delegates to specialized agents,
supports revision loops, and uses project scripts as the
authoritative execution path for scaffold,
structural validation, build, and artifact validation.

## Steps

1. **Requirements capture** — Invoke `package-requirements-analyst`
  with the user's intent. If the output blueprint has unresolved
  questions or ambiguous IDs, return the questions to the user
  and re-invoke the analyst with clarified input.
  Do not proceed until the blueprint includes scaffold arguments
  and an authoring plan.

2. **Scaffold creation** — Invoke `package-script-runner` to execute
  `npm run package:create -- --namespace <namespace> --package <package-id> ...`
  using the approved blueprint arguments.
  Namespace MUST match `metadata.owner` in phase 1.
  If scaffold execution fails,
  surface command errors to the user, revise the blueprint in step 1,
  and retry this step.

3. **Definition authoring and review** — Invoke `package-creator`
  to author package definitions, then invoke
  `package-submission-reviewer` for quality review.
  If reviewer verdict is `needs-clarification`, ask the user
  and repeat this step. If verdict is `needs-revision`,
  send revisions to `package-creator` and repeat this step.
  Proceed only when reviewer verdict is `ready`.

4. **Source validation** — Invoke `package-script-runner` to execute
  `npm run package:validate -- --package <namespace>/<package-id>`.
  If validation fails, route findings to `package-creator` for fixes,
  optionally re-run step 3 for quality checks,
  then repeat this step until it passes or user stops.

5. **Build snapshot** — Invoke `package-script-runner` to execute
  `npm run package:build -- --package <namespace>/<package-id>`. If build fails,
  send command errors to `package-creator`
  (and step 1 if argument-level issues are found),
  then re-run step 4 before retrying build.

6. **Artifact release gate** — Invoke `package-release-gate` to execute
  `npm run package:validate-artifacts -- --package <namespace>/<package-id>`
  (optionally with `--version`). If gate fails,
  route findings to `package-creator`, then re-run steps 4 through 6.
  On pass, present the release-gated package result to the user.

## Error Handling

- **Invalid IDs or collisions**: if package, agent, or flow IDs violate
  `^[a-z0-9]+(?:-[a-z0-9]+)*$` or collide across agents and flows,
  return to `package-requirements-analyst`
  before running scripts again.
- **Namespace/owner mismatch**: if `--namespace` does not match
  `--owner` or `metadata.owner`, return to `package-requirements-analyst`
  to correct the blueprint before running scripts again.
- **Flat-path metadata URLs**: if `homepage` or `quickstart` uses
  the old flat `packages/<package-id>/` path instead of
  `packages/<namespace>/<package-id>/`, route to `package-creator`
  for homepage and quickstart fixes.
- **Create script failure**: if `package:create` fails,
  do not author files manually to bypass scaffold;
  fix arguments or metadata assumptions,
  then retry `package:create`.
- **Authoring incompleteness**: if paired files are missing
  or fields are out of sync, route to `package-creator`
  and rerun `package:validate`.
- **Validate failure**: if `package:validate` reports errors,
  route findings to `package-creator`,
  then repeat steps 3 and 4 until pass.
- **Build failure**: if `package:build` fails due to validation
  or versioning issues, route to `package-creator`
  and rerun steps 4 and 5.
- **Artifact gate failure**: if `package:validate-artifacts` fails,
  route findings to `package-creator`, then rerun steps 4 to 6.
- **Reviewer escalation**: if after three cycles reviewer verdict
  remains `needs-revision` for the same issues,
  surface unresolved findings to the user.
- **Script escalation**: if the same script stage fails twice
  with unchanged errors, surface command output
  and request user decision before retrying.

## Interaction Contract

Input: a free-form description of the user's package goals.
The user may optionally provide a partial blueprint,
draft file contents, or specific revision instructions
to start the flow at a later step.

Output: the fully authored, reviewed, validated, built,
and artifact-gated package source tree.
The user may exit the flow after any step and invoke specialist
agents directly: `package-requirements-analyst` for scope changes,
`package-creator` for targeted edits,
`package-submission-reviewer` for quality checks,
`package-script-runner` for create/validate/build execution,
and `package-release-gate` for artifact gate execution.
