#!/usr/bin/env tsx
/**
 * package-build — Builds and publishes a versioned release for a registry package.
 *
 * Usage:
 *   npm run package:build -- --package <id> [--force-rebuild]
 *
 * This script is the SOLE authorized writer for versioned snapshot artifacts.
 * Contributors and AI agents MUST NOT manually create or modify files
 * under the versions directory. See specs/package-format.md and
 * specs/versioning-rules.md.
 *
 * Workflow:
 *   1. Run preflight validation equivalent to package:validate.
 *   2. Read target version and enforce overwrite-protection rules.
 *   3. Build the deployment ZIP and source archive.
 *   4. Compute SHA-256 checksums.
 *   5. Write the version snapshot to the target version directory.
 *   6. Upsert the manifest in the versions directory.
 *   7. Update the package index file.
 *
 * Exits 0 on success, non-zero on failure.
 */

import { buildPackageSnapshot } from './lib/build/package-build-flow';
import { hasFlag, parseRequiredPackageId, resolveScriptPaths } from './lib/cli';
import { PackageError } from './lib/errors';

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const packageId = parseRequiredPackageId(process.argv);
  const forceRebuild = hasFlag(process.argv, '--force-rebuild');

  const { repoRoot, packagesDir } = resolveScriptPaths(import.meta.url);
  let buildResult: Awaited<ReturnType<typeof buildPackageSnapshot>>;

  try {
    buildResult = await buildPackageSnapshot({
      packageId,
      repoRoot,
      packagesDir,
      forceRebuild,
      log: console.log,
    });
  } catch (error) {
    if (error instanceof PackageError) {
      console.error(`[${error.code}] ${error.message}`);
    } else {
      console.error('Unexpected error during build:', error);
    }
    process.exit(1);
  }

  console.log(`\nBuild complete: ${packageId}@${buildResult.version}`);
  console.log(`  Deployment artifact : ${buildResult.version}.zip`);
  console.log(`  Source archive      : ${buildResult.version} source archive`);
  console.log('  Manifest updated');
  console.log('  Index updated');
}

try {
  await main();
} catch (error) {
  if (error instanceof PackageError) {
    console.error(`[${error.code}] ${error.message}`);
  } else {
    console.error('Unexpected error during build:', error);
  }
  process.exit(1);
}
