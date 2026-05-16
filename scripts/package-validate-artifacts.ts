#!/usr/bin/env tsx
/**
 * package-validate-artifacts — Deep structural and security validation for a
 * built package version snapshot.
 *
 * Usage:
 *   npm run package:validate-artifacts -- --package <id> [--version <semver>]
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
import {
  parseOptionalFlagValue,
  parseReleaseVersion,
  parseRequiredPackageId,
  resolveScriptPaths,
} from './lib/cli';
import { exitWithValidationResult } from './lib/cli/reporting';
import { SnapshotValidator } from './lib/snapshot-validator';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface BuildValidateArgs {
  packageId: string;
  version: string | undefined;
}

function parseArgs(argv: string[]): BuildValidateArgs {
  return {
    packageId: parseRequiredPackageId(argv),
    version: parseOptionalFlagValue(argv, '--version'),
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function main(): void {
  const { packageId, version: versionArg } = parseArgs(process.argv);
  const { packagesDir } = resolveScriptPaths(import.meta.url);

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
    const parsedVersion = parseReleaseVersion(metadata.version);
    if (!parsedVersion) {
      console.error(`Version in metadata.json must be a MAJOR.MINOR.PATCH release version, got: ${JSON.stringify(metadata.version)}`);
      process.exit(1);
    }
    version = parsedVersion;
  }

  const normalizedVersion = parseReleaseVersion(version);
  if (!normalizedVersion) {
    console.error(`--version must be a MAJOR.MINOR.PATCH release version, got: ${JSON.stringify(version)}`);
    process.exit(1);
  }
  version = normalizedVersion;

  console.log(`Validating build for ${packageId}@${version}`);

  const report = new SnapshotValidator(packageId, version, packagesDir).validate();

  exitWithValidationResult(report, {
    successMessage: `Build validation passed for ${packageId}@${version}`,
    failurePrefix: `Build validation failed for ${packageId}@${version}`,
  });
}

main();
