#!/usr/bin/env tsx
/**
 * package-build — Builds and publishes a versioned release for a registry package.
 *
 * Usage:
 *   npm run package:build -- --package <id> [--force-rebuild]
 *
 * This script is the SOLE authorized writer for versions/ artifacts.
 * Contributors and AI agents MUST NOT manually create or modify files
 * under versions/. See specs/package-format.md and specs/versioning-rules.md.
 *
 * Workflow:
 *   1. Read target version and enforce overwrite-protection rules.
 *   2. Build the deployment ZIP and source archive.
 *   3. Compute SHA-256 checksums.
 *   4. Write the version snapshot to versions/<version>/.
 *   5. Upsert the manifest at versions/manifest.json.
 *   6. Update packages/index.json.
 *
 * Exits 0 on success, non-zero on failure.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollbackVersionDirectory, warnIfIndexMayBeInconsistent } from './lib/build/rollback';
import { updateManifestAndIndexWithRollback } from './lib/build/registry-sync';
import { prepareVersionSnapshot } from './lib/build/snapshot-writer';
import { ErrorCode, PackageError } from './lib/errors';
import { GitContext } from './lib/git';
import { Package } from './lib/package';
import { ValidationUtils } from './lib/validation-utils';
import { ZipBuilder } from './lib/zip-builder';
import { Checksum } from './lib/checksum';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface BuildArgs {
  packageId: string;
  forceRebuild: boolean;
}

function parseArgs(argv: string[]): BuildArgs {
  const args = argv.slice(2);
  const idx = args.indexOf('--package');
  if (idx === -1 || !args[idx + 1]) {
    console.error('Error: --package <id> is required');
    process.exit(1);
  }
  return {
    packageId: args[idx + 1],
    forceRebuild: args.includes('--force-rebuild'),
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { packageId, forceRebuild } = parseArgs(process.argv);

  const repoRoot = path.resolve(scriptDir, '..');
  const packagesDir = path.join(repoRoot, 'packages');
  const pkg = new Package(packageId, packagesDir);

  // Step 1: Read metadata to get target version
  const metadata = pkg.loadMetadata();
  const version = metadata.version;
  if (!ValidationUtils.isReleaseVersion(version)) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `metadata.json version must be a MAJOR.MINOR.PATCH release version, got: ${JSON.stringify(version)}`,
    );
  }
  console.log(`[1/6] Target version: ${version}`);

  // Step 2: Overwrite-protection checks
  const versionDir = pkg.versionDir(version);
  const versionExists = fs.existsSync(versionDir);
  const git = new GitContext();

  if (versionExists) {
    const branch = await git.getBranch();
    if (forceRebuild) {
      if (git.isProtected(branch)) {
        throw new PackageError(
          ErrorCode.ERR_OVERWRITE_PROTECTED_BRANCH,
          `Cannot overwrite version "${version}" on protected branch "${branch}". ` +
            `--force-rebuild is not allowed on protected branches (main, master, release/*).`,
        );
      }
      console.log(
        `[2/6] --force-rebuild on branch "${branch}": overwriting existing version "${version}"`,
      );
      fs.rmSync(versionDir, { recursive: true, force: true });
    } else {
      throw new PackageError(
        ErrorCode.ERR_VERSION_EXISTS,
        `Version "${version}" already exists at ${versionDir}. ` +
          `Use --force-rebuild on a non-protected branch to overwrite.`,
      );
    }
  } else {
    console.log(`[2/6] Overwrite check passed (new version)`);
  }

  // Step 3: Create version snapshot directory structure
  console.log(`[3/6] Building version snapshot for ${version}`);
  const { deployZipPath, srcZipPath } = prepareVersionSnapshot(pkg, versionDir, version);

  try {
    // Step 4: Build deployment ZIP
    console.log(`[4/6] Building deployment ZIP: ${version}.zip`);
    const zipBuilder = new ZipBuilder(pkg.packageDir, version);
    zipBuilder.buildDeploymentZip(deployZipPath);

    // Build source archive
    console.log(`[5/6] Building source archive: ${version}-src.zip`);
    zipBuilder.buildSourceZip(srcZipPath);

    // Step 6: Compute checksums
    const deployZipSha256 = Checksum.sha256(deployZipPath);
    const srcZipSha256 = Checksum.sha256(srcZipPath);
    console.log(`       deploy sha256: ${deployZipSha256}`);
    console.log(`       src    sha256: ${srcZipSha256}`);

    // Prepare manifest update with rollback support
    console.log(`[6/6] Updating versions/manifest.json and packages/index.json`);
    const indexPath = path.join(repoRoot, 'packages', 'index.json');
    updateManifestAndIndexWithRollback({
      packageId,
      manifestPath: pkg.manifestPath,
      indexPath,
      metadata,
      version,
      deployZipSha256,
      srcZipSha256,
    });
  } catch (error) {
    rollbackVersionDirectory(versionDir);
    
    // Attempt to restore old index.json if it was overwritten
    const indexPath = path.join(repoRoot, 'packages', 'index.json');
    warnIfIndexMayBeInconsistent(indexPath, packageId);
    
    if (error instanceof PackageError) {
      console.error(`[${error.code}] ${error.message}`);
    } else {
      console.error(`Unexpected error during build:`, error);
    }
    process.exit(1);
  }

  console.log(`\nBuild complete: ${packageId}@${version}`);
  console.log(`  Deployment artifact : versions/${version}/${version}.zip`);
  console.log(`  Source archive      : versions/${version}/${version}-src.zip`);
  console.log(`  Manifest updated    : versions/manifest.json`);
  console.log(`  Index updated       : packages/index.json`);
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
