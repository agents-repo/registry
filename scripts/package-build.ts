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
 *   1. Run preflight validation equivalent to package:validate.
 *   2. Read target version and enforce overwrite-protection rules.
 *   3. Build the deployment ZIP and source archive.
 *   4. Compute SHA-256 checksums.
 *   5. Write the version snapshot to versions/<version>/.
 *   6. Upsert the manifest at versions/manifest.json.
 *   7. Update packages/index.json.
 *
 * Exits 0 on success, non-zero on failure.
 */

import fs from 'node:fs';
import path from 'node:path';
import { rollbackVersionDirectory, warnIfIndexMayBeInconsistent } from './lib/build/rollback';
import { updateManifestAndIndexWithRollback } from './lib/build/registry-sync';
import { prepareVersionSnapshot } from './lib/build/snapshot-writer';
import { hasFlag, parseRequiredPackageId, resolveScriptPaths } from './lib/cli';
import { printValidationIssues } from './lib/cli/reporting';
import { ErrorCode, PackageError } from './lib/errors';
import { GitContext } from './lib/git';
import { Package } from './lib/package';
import { PackageValidator } from './lib/validate-package';
import { ValidationUtils } from './lib/validation-utils';
import { ZipBuilder } from './lib/zip-builder';
import { Checksum } from './lib/checksum';

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const packageId = parseRequiredPackageId(process.argv);
  const forceRebuild = hasFlag(process.argv, '--force-rebuild');

  const { repoRoot, packagesDir } = resolveScriptPaths(import.meta.url);
  const pkg = new Package(packageId, packagesDir);

  // Step 1: Run preflight validation
  console.log(`[1/7] Running preflight validation`);
  const report = new PackageValidator(packageId, packagesDir).validate();
  printValidationIssues(report);
  if (!report.passed) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `Preflight validation failed for package: ${packageId} — ${report.errors.length} error(s)`,
    );
  }
  console.log(`[1/7] Preflight passed`);

  // Step 2: Read metadata to get target version, then re-validate the exact
  // on-disk package state before proceeding with the build.
  const metadata = pkg.loadMetadata();
  const postLoadReport = new PackageValidator(packageId, packagesDir).validate();
  printValidationIssues(postLoadReport);
  if (!postLoadReport.passed) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `Package changed after preflight validation for package: ${packageId} — ${postLoadReport.errors.length} error(s)`,
    );
  }

  const version = metadata.version;
  if (!ValidationUtils.isReleaseVersion(version)) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `metadata.json version must be a MAJOR.MINOR.PATCH release version, got: ${JSON.stringify(version)}`,
    );
  }
  console.log(`[2/7] Target version: ${version}`);

  // Step 3: Overwrite-protection checks
  const versionDir = pkg.versionDir(version);
  const versionExists = fs.existsSync(versionDir);
  const git = new GitContext();

  if (versionExists) {
    const { branch, source } = await git.getBranchWithSource();
    if (forceRebuild) {
      if (git.isProtected(branch)) {
        throw new PackageError(
          ErrorCode.ERR_OVERWRITE_PROTECTED_BRANCH,
          `Cannot overwrite version "${version}" on protected branch "${branch}". ` +
            `--force-rebuild is not allowed on protected branches (main, master, release/*).`,
        );
      }
      console.log(
        `[3/7] --force-rebuild on branch "${branch}" (detected from ${source}): overwriting existing version "${version}"`,
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
    console.log(`[3/7] Overwrite check passed (new version)`);
  }

  // Step 4: Create version snapshot directory structure
  console.log(`[4/7] Building version snapshot for ${version}`);
  const { deployZipPath, srcZipPath } = prepareVersionSnapshot(pkg, versionDir, version);

  try {
    // Step 5: Build deployment ZIP
    console.log(`[5/7] Building deployment ZIP: ${version}.zip`);
    const zipBuilder = new ZipBuilder(pkg.packageDir, version);
    zipBuilder.buildDeploymentZip(deployZipPath);

    // Build source archive
    console.log(`[6/7] Building source archive: ${version}-src.zip`);
    zipBuilder.buildSourceZip(srcZipPath);

    // Step 7: Compute checksums and update registry state
    const deployZipSha256 = Checksum.sha256(deployZipPath);
    const srcZipSha256 = Checksum.sha256(srcZipPath);
    console.log(`       deploy sha256: ${deployZipSha256}`);
    console.log(`       src    sha256: ${srcZipSha256}`);

    // Prepare manifest update with rollback support
    console.log(`[7/7] Updating versions/manifest.json and packages/index.json`);
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
