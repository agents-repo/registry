# refactor-or-trash

Funny-but-grounded call: refactor, strangler, or trash a codebase. Audits debt, scores salvage vs wrap vs rewrite, then delivers the verdict. Workspace flow for host trees; chat-web for public repos. Does not delete or rewrite. Replies match the user language.

## Quickstart

Use this package as a starting point for agents and flows in the registry.

## Package Contents

- Agents and flows under this package root
- Metadata contract in `metadata.json`

## Usage

Run build and validation commands from the repository root:

```bash
npm run package:build -- --package refactor-or-trash
npm run package:validate-artifacts -- --package refactor-or-trash --version 1.0.0
```

The build script automatically runs preflight validation before generating
artifacts.
