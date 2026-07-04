#!/usr/bin/env tsx
/**
 * package-sync-ide-targets — Regenerate committed IDE deployment mirrors.
 *
 * Usage:
 *   npm run package:sync-ide-targets -- --package <namespace>/<package-id> --target <target>
 *
 * Targets:
 *   github-copilot  Write .github/agents/*.agent.md from package agents/ + flows/
 *   cursor          Write .cursor/skills/<id>/SKILL.md from package agents/ + flows/
 *   cursor-rules    Write .cursor/rules/agents-registry.mdc from copilot-instructions.md
 *   all             Run all three (requires --package)
 */

import { parseOptionalFlagValue, parseRequiredPackageId, resolveScriptPaths } from './lib/cli';
import { Package } from './lib/package';
import { IDE_SYNC_TARGETS, syncIdeTargets, type IdeSyncTarget } from './lib/sync/ide-targets';
import { PackageError } from './lib/errors';

function printHelp(): void {
  console.log(`Usage:
  npm run package:sync-ide-targets -- --package <namespace>/<package-id> --target <target>

Targets:
  github-copilot  Sync .github/agents/ from package source
  cursor          Sync .cursor/skills/ from package source
  cursor-rules    Sync .cursor/rules/agents-registry.mdc from copilot-instructions.md
  all             Run github-copilot, cursor, and cursor-rules

Canonical sources:
  Package agents/flows  -> .github/agents/ and .cursor/skills/
  copilot-instructions.md -> .cursor/rules/agents-registry.mdc

Do not edit deployment mirrors directly; edit canonical sources and re-run this script.
`);
}

function parseTarget(argv: string[]): IdeSyncTarget {
  const value = parseOptionalFlagValue(argv, '--target');
  if (value === undefined || value.length === 0) {
    console.error(`Error: --target is required. Valid values: ${IDE_SYNC_TARGETS.join(', ')}`);
    process.exit(1);
  }

  if (!(IDE_SYNC_TARGETS as readonly string[]).includes(value)) {
    console.error(`Error: invalid --target ${JSON.stringify(value)}. Valid values: ${IDE_SYNC_TARGETS.join(', ')}`);
    process.exit(1);
  }

  return value as IdeSyncTarget;
}

function main(): void {
  const argv = process.argv;
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    return;
  }

  const target = parseTarget(argv);
  const { repoRoot, packagesDir } = resolveScriptPaths(import.meta.url);
  const packageArg = parseOptionalFlagValue(argv, '--package');

  let pkg: Package | undefined;
  if (packageArg !== undefined && packageArg.length > 0) {
    const qualifiedId = parseRequiredPackageId(argv);
    pkg = new Package(qualifiedId, packagesDir);
  }

  if (target !== 'cursor-rules' && pkg === undefined) {
    console.error('Error: --package <namespace>/<package-id> is required for this target');
    process.exit(1);
  }

  try {
    const written = syncIdeTargets(repoRoot, pkg, target);
    console.log(`Synced IDE target(s): ${target}`);
    for (const filePath of written) {
      console.log(`  ${filePath}`);
    }
  } catch (error) {
    if (error instanceof PackageError) {
      console.error(`Error [${error.code}]: ${error.message}`);
    } else {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exit(1);
  }
}

main();
