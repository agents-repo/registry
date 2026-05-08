#!/usr/bin/env tsx
/**
 * package-build-validate — Deep structural and security validation for a
 * built package version snapshot.
 *
 * Usage:
 *   npm run package:build-validate -- --package <id> [--version <semver>]
 *
 * When --version is omitted, the version is read from packages/<id>/metadata.json.
 *
 * Checks performed:
 *   - Expected files present in versions/<version>/
 *   - No unexpected extra files in the snapshot directory
 *   - Deep deployment ZIP inspection (path traversal, symlinks, collisions,
 *     allow-list, frontmatter version)
 *   - Deep source ZIP inspection (path traversal, symlinks, no versions/,
 *     disallowed binary extensions, frontmatter version for .agent.md)
 *   - SHA-256 checksum recomputation and comparison against manifest
 *
 * Exits 0 on success, non-zero on any error.
 */

import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';
import { SnapshotValidator } from './lib/snapshot-validator';
import type { ValidationReport } from './lib/types';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface BuildValidateArgs {
  packageId: string;
  version: string | undefined;
}

function parseArgs(argv: string[]): BuildValidateArgs {
  const args = argv.slice(2);
  const pkgIdx = args.indexOf('--package');
  if (pkgIdx === -1 || !args[pkgIdx + 1]) {
    console.error('Error: --package <id> is required');
    process.exit(1);
  }
  const verIdx = args.indexOf('--version');
  return {
    packageId: args[pkgIdx + 1],
    version: verIdx !== -1 ? args[verIdx + 1] : undefined,
  };
}

// ---------------------------------------------------------------------------
// Exported function for use by package-build
// ---------------------------------------------------------------------------

export function runBuildValidate(
  packageId: string,
  version: string,
  packagesDir: string,
): ValidationReport {
  return new SnapshotValidator(packageId, version, packagesDir).validate();
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function main(): void {
  const { packageId, version: versionArg } = parseArgs(process.argv);

  const repoRoot = path.resolve(__dirname, '..');
  const packagesDir = path.join(repoRoot, 'packages');

  let version = versionArg;
  if (!version) {
    const metadataPath = path.join(packagesDir, packageId, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      console.error(`metadata.json not found for package: ${packageId}`);
      process.exit(1);
    }
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as {
      version?: string;
    };
    if (!metadata.version || !semver.valid(metadata.version)) {
      console.error(`Invalid or missing version in metadata.json for package: ${packageId}`);
      process.exit(1);
    }
    version = metadata.version;
  }

  if (!semver.valid(version)) {
    console.error(`Invalid semver: ${version}`);
    process.exit(1);
  }

  console.log(`Validating build for ${packageId}@${version}`);

  const report = runBuildValidate(packageId, version, packagesDir);

  for (const w of report.warnings) {
    console.warn(`  [WARN]  ${w.message}`);
  }
  for (const e of report.errors) {
    console.error(`  [ERROR] (${e.code}) ${e.message}`);
  }

  if (report.passed) {
    console.log(`Build validation passed for ${packageId}@${version}`);
    process.exit(0);
  } else {
    console.error(
      `Build validation failed for ${packageId}@${version} — ${report.errors.length} error(s)`,
    );
    process.exit(1);
  }
}

// Run CLI only when this file is directly executed, not when imported
if (require.main === module) {
  main();
}
