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

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCreateArgs } from './lib/create/args';
import { buildCreationRequest } from './lib/create/request-builder';
import { printCreateHelp } from './lib/create/templates';
import { PackageScaffolder } from './lib/scaffolder';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));

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
    const repoRoot = path.resolve(scriptDir, '..');
    const request = buildCreationRequest(parsed, repoRoot, fail);

    new PackageScaffolder(
      { packageId: request.packageId, metadata: request.metadata, agents: request.agents, flows: request.flows },
      repoRoot,
    ).scaffold();

    console.log('\nPackage created successfully\n');
    console.log(`Location: packages/${request.packageId}/\n`);
    console.log('Next steps:');
    console.log(`  1. npm run package:validate -- --package ${request.packageId}`);
    console.log(`  2. npm run package:build -- --package ${request.packageId}`);
    console.log(`  3. npm run package:validate-artifacts -- --package ${request.packageId}\n`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
