---
name: full-package-creation-flow
description: Orchestrates iterative package authoring and validation by coordinating requirements analysis, source drafting, submission review, and registry compliance checks.
version: 1.0.0
license: MIT
agents:
  - package-requirements-analyst
  - package-creator
  - package-submission-reviewer
  - package-registry-validator
inputs:
  - name: user-intent
    type: string
    description: A free-form description of what the user wants the package to do or contain.
outputs:
  - name: validated-package-source
    type: object
    description: The fully authored, reviewed, and registry-valid package source tree ready for release preparation.
---

# Overview

Coordinate the full iterative cycle of creating a new registry package from a user's idea to a submission-ready, spec-compliant source tree. The flow delegates to four specialist agents, supports multiple revision loops, and allows users to exit and re-enter at any stage without losing progress. Release artifact generation is outside this flow's scope; it focuses exclusively on producing correct and high-quality package source files.

## Steps

1. **Requirements capture** — Invoke `package-requirements-analyst` with the user's intent. If the output blueprint has unresolved questions or ambiguous IDs, return the questions to the user and re-invoke the analyst with the clarified input. Do not proceed to step 2 until the blueprint is complete and all open questions are resolved.

2. **Package drafting** — Invoke `package-creator` with the approved blueprint. The creator produces the full working-copy source tree: `metadata.json`, all agent `.agent.md` and `.metadata.json` pairs, and all flow `.agent.md` and `.metadata.json` pairs. If the creator reports that the blueprint is insufficient to produce a specific file, route back to step 1 with the gap identified.

3. **Submission review** — Invoke `package-submission-reviewer` with the authored source tree. If the verdict is `needs-clarification`, surface the reviewer's questions to the user, incorporate the answers, and re-invoke the reviewer. If the verdict is `needs-revision`, send the revision requests to `package-creator` and return to step 3 with the updated files. Proceed to step 4 only when the verdict is `ready`.

4. **Registry validation** — Invoke `package-registry-validator` with the source tree. If the report result is `fail`, send each violation to `package-creator` for correction. After the creator produces the corrected files, re-invoke the validator. If the corrections also affect agent descriptions, role boundaries, or interaction contracts, optionally re-run step 3 before re-running step 4. Proceed to step 5 only when the validator reports `pass`.

5. **Completion** — Present the validated source tree to the user. Inform them that the package source is ready for release preparation, which includes creating the `versions/` snapshot, generating deployment and source ZIPs, computing SHA-256 checksums, and updating `versions/manifest.json`. Those steps are outside this flow and may be handled by a dedicated release agent.

## Error Handling

- **Invalid package or agent ID**: if any proposed ID does not match `^[a-z0-9]+(?:-[a-z0-9]+)*$`, route back to `package-requirements-analyst` to produce a corrected blueprint before the creator authors any files.
- **ID collision across agents and flows**: if the blueprint or the authored tree contains the same ID in both `agents/` and `flows/`, route back to the analyst with the collision identified; do not proceed to drafting.
- **Missing paired file**: if any `.agent.md` is missing its `.metadata.json` sidecar or vice versa, route to `package-creator` to produce the missing file before re-running validation.
- **Frontmatter/metadata mismatch**: if any duplicated field between a `.agent.md` frontmatter and its `.metadata.json` is not byte-identical, route to `package-creator` for correction and re-run the validator.
- **Shared version inconsistency**: if root `.agent.md` files across `agents/` and `flows/` do not share the same frontmatter `version`, route to `package-creator` to align the version and re-run the validator.
- **Unresolved flow agent reference**: if a flow's `agents[]` references an ID not present in `agents/`, route to the analyst to decide whether to add the missing agent or remove the reference, then route to the creator to update the affected files.
- **Required section missing or out of order**: if the validator identifies a missing or misordered body section in any `.agent.md`, route to `package-creator` for correction and re-run the validator.
- **Reviewer escalation**: if after three revision cycles the reviewer still returns `needs-revision` for the same issues, surface the unresolved findings to the user for a decision before continuing.
- **Validator escalation**: if after two correction cycles the validator still returns `fail` for the same violations, surface the unresolved violations to the user for a decision before continuing.

## Interaction Contract

Input: a free-form description of the user's package goals. The user may optionally provide a partial blueprint, draft file contents, or specific revision instructions to start the flow at a later step.

Output: the fully authored, reviewed, and registry-valid package source tree. The user may exit the flow after any step and invoke the specialist agents directly for additional iterations: `package-requirements-analyst` for scope changes, `package-creator` for targeted edits, `package-submission-reviewer` for quality re-checks, and `package-registry-validator` for compliance re-checks.
