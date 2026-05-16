#!/usr/bin/env tsx
/**
 * package-create - Args-only scaffolding for new registry packages.
 *
 * Usage:
 *   npm run package:create -- --package <id> --template <template-id> --description "..."
 *
 * Flags:
 *   --package <id>
 *   --template <single-agent|single-agent-flows|multi-agent|blank>
 *   --name <value>
 *   --description <value>
 *   --owner <value>
 *   --tags <comma-separated>
 *   --homepage <url>
 *   --repository <url>
 *   --maintainers <comma-separated>
 *   --agent <id|name|description>     (repeatable)
 *   --flow <id|name|description>      (repeatable)
 *   --help
 *
 * Exits 0 on success, non-zero on failure.
 */

import { parseCreateArgs } from './lib/create/args';
import { printCreateSuccess } from './lib/create/output';
import { buildCreationRequest } from './lib/create/request-builder';
import { printCreateHelp } from './lib/create/templates';
import { resolveScriptPaths } from './lib/cli/paths';
import { PackageScaffolder } from './lib/scaffolder';

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function main(): void {
  const parsed = parseCreateArgs(process.argv, fail);

  if (parsed.help) {
    printCreateHelp();
    return;
  }

  console.log('\nCopilot Agents Registry - Package Create\n');

  try {
    const { repoRoot } = resolveScriptPaths(import.meta.url);
    const request = buildCreationRequest(parsed, repoRoot, fail);

    new PackageScaffolder(
      { packageId: request.packageId, metadata: request.metadata, agents: request.agents, flows: request.flows },
      repoRoot,
    ).scaffold();

    printCreateSuccess(request.packageId);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
