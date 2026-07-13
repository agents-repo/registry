# Tests

This repository uses a hybrid test organization model.
This document is the canonical guide for test layout and conventions.

## Layout

- `tests/unit/`: unit tests mirrored from `scripts/lib/` paths
- `tests/integration/`: multi-module integration scenarios
- `tests/e2e/`: end-to-end and workflow-level checks
- `tests/fixtures/`: shared test inputs and snapshots
- `tests/helpers/`: shared test utilities

Current baseline focuses on `tests/unit/`.
Package-create smoke flows belong in `tests/integration/` and should reuse
`tests/helpers/` for shared temp package setup when appropriate.
These smoke flows should exercise the real package scripts in a temp workspace,
not call the lower-level build helpers directly, so they match the CI smoke
workflow and the AI-driven verification path.

## Unit Test Path Convention

Mirror source paths under `scripts/lib/`.

Examples:

- Source: `scripts/lib/index-manager.ts`
- Test: `tests/unit/scripts/lib/index-manager.test.ts`

- Source: `scripts/lib/validators/package/metadata.ts`
- Test: `tests/unit/scripts/lib/validators/package/metadata.test.ts`

## Commands

- Run all tests: `npm run test:run`
- Run in watch mode: `npm test`
- Run coverage: `npm run test:coverage`

## Scope Guidance

Use unit tests for isolated module behavior and deterministic edge cases.
Use integration and e2e tests for cross-module or workflow orchestration.

ZIP tooling tests:

- `tests/integration/zip-adm-roundtrip.test.ts` exercises real `adm-zip`
  write/read paths with `zip-scan` validators (no mocks).
- `tests/unit/scripts/lib/zip-builder.test.ts` asserts repeated builds produce
  identical ZIP bytes for deployment and source archives.
- `tests/unit/scripts/lib/emitters/target-zip-builder.test.ts` covers
  install-target artifact layout and checksum stability.
