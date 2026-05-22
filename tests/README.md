# Tests

This repository uses a hybrid test organization model.

## Layout

- `tests/unit/`: unit tests mirrored from `scripts/lib/` paths
- `tests/integration/`: multi-module integration scenarios
- `tests/e2e/`: end-to-end and workflow-level checks
- `tests/fixtures/`: shared test inputs and snapshots
- `tests/helpers/`: shared test utilities

Current baseline focuses on `tests/unit/`.

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
