# Namespace Rules (Phase 1)

This document defines how package namespaces work in the Agents Repo registry.

## Phase 1 scope

| Rule | Phase 1 |
| --- | --- |
| Namespace source | Directory segment under `packages/<namespace>/` |
| Relation to `owner` | `namespace` MUST equal `metadata.owner` (enforced at build) |
| Custom namespaces | Not supported — `owners.json` MUST NOT exist |
| Path construction | Always use explicit `namespace` — never derive from `owner` |
| Qualified ID | `namespace/package-id` (e.g. `agents-repo/hello-agent`) |

## Directory layout

```text
packages/
  index.json
  tree.json
  <namespace>/
    <package-id>/
      metadata.json
      agents/ flows/ versions/
```

## Resolution rules

1. **Namespace from path** — The first directory segment under `packages/`
   (excluding root index files) is the namespace.
2. **Owner consistency** — Build validation MUST assert
   `namespace === metadata.owner`. Mismatch is a hard error.
3. **No custom namespaces** — `packages/<namespace>/owners.json` MUST NOT
   exist in phase 1.
4. **Single-level only** — Namespace and package-id both match
   `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
5. **Reserved names** — `index.json` and `tree.json` at `packages/` root are
   not namespaces.

## CLI

- `package:create` requires `--namespace <ns>`; MUST match `metadata.owner`
  in phase 1.
- Build/validate commands use qualified `--package <namespace>/<package-id>`.

## Future: custom namespaces (not implemented)

Collaborative namespaces may be supported in a future release via
`owners.json`:

```json
{
  "owners": ["alice", "bob"]
}
```

When implemented, `namespace` may diverge from any single `metadata.owner`.
Consumers MUST continue using the `namespace` field for paths and qualified
IDs.

See [MIGRATION.md](./MIGRATION.md) for upgrading from flat package paths.
