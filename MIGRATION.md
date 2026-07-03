# Migration: Flat to Namespaced Package Paths

Registry v2.0.0 moves packages from flat `packages/<package-id>/` to
namespaced `packages/<namespace>/<package-id>/`.

## What changed

| Area | Before (v1.x) | After (v2.x) |
| --- | --- | --- |
| Package directory | `packages/hello-agent/` | `packages/agents-repo/hello-agent/` |
| Index `packages[].id` | `hello-agent` | `agents-repo/hello-agent` |
| Index schema | `1.2.0` | `1.3.0` (`namespace`, `package`, `path`, `aliases`) |
| CLI `--package` | `hello-agent` | `agents-repo/hello-agent` |
| `package:create` | `--package <id>` only | `--namespace <ns>` required (must match `owner`) |

## Contributor steps

1. Move your package directory:

   ```bash
   git mv packages/<package-id> packages/<owner>/<package-id>
   ```

   Use your GitHub owner slug as the namespace (phase 1: `namespace === owner`).

2. Update root `metadata.json` URLs (`quickstart`, `homepage`) if they
   reference the old flat path. Do **not** edit published files under
   `versions/`.

3. Rebuild the index:

   ```bash
   npm run package:index:rebuild
   ```

4. Use qualified refs in CLI commands:

   ```bash
   npm run package:validate -- --package agents-repo/hello-agent
   npm run package:build -- --package agents-repo/hello-agent
   npm run package:validate-artifacts -- --package agents-repo/hello-agent
   ```

5. Create new packages with namespace:

   ```bash
   npm run package:create -- --namespace agents-repo --package my-package ...
   ```

## Consumers (webapp, proxy, tooling)

- Artifact URLs: `packages/<namespace>/<package-id>/versions/...`
- Search aliases: `index.json` `aliases` maps leaf id → qualified id
- Pinning v1.x tags still serves the flat layout

See [NAMESPACE_RULES.md](./NAMESPACE_RULES.md) for full namespace semantics.
