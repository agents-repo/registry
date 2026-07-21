# AGENTS.md

## Cursor Cloud specific instructions

Standard commands and workflow live in `README.md` and
`.github/copilot-instructions.md` (mirrored to
`.cursor/rules/agents-registry.mdc`). Notes below are non-obvious environment
caveats for this Cloud VM.

### Toolchain (shared across the agents-repo repos)

- Node and npm are provided through `nvm` + Corepack. The Cloud startup/update
  script installs Node `24.15.0` and `24.18.0` and activates Corepack
  `npm@12.0.1`, so you normally do not reinstall them.
- Gotcha: `/exec-daemon/node` (Node 22) sits ahead of `nvm` on `PATH`, so a bare
  `node` resolves to Node 22 and `npm run env:check` (exact `24.15.0`) fails.
  Prepend this repo's pinned Node bin before running scripts:

  ```bash
  export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
  ver="$(tr -d ' \n\r' < .nvmrc)"
  export PATH="$HOME/.nvm/versions/node/v$ver/bin:$PATH"; hash -r
  ```

  After this, `node -v` = `v24.15.0` and `npm -v` = `12.0.1`.

### This repo

- Data/spec-first; there is no long-running server. Validate with
  `npm run env:check`, `npm run lint:all`, `npm run test:run` (vitest, 141
  tests), `npm run typecheck`, and the `package:*` scripts documented in
  `README.md`.
