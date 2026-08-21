# plan-refiner

Refine an existing feature or implementation plan against the current
repository: find gaps and inconsistencies. Interactive ask-first or
automatic assumption-first. Planning only; does not implement.

## Quickstart

Use this package as a starting point for agents and flows in the registry.

## Package Contents

- Agents and flows under this package root
- Metadata contract in `metadata.json`

## Usage

Run build and validation commands from the repository root:

```bash
npm run package:build -- --package plan-refiner
npm run package:validate-artifacts -- --package plan-refiner --version 1.0.0
```

The build script automatically runs preflight validation before generating
artifacts.
