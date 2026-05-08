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
 *   1. Run internal package validation (same as package:validate).
 *   2. Enforce overwrite-protection rules (see specs/versioning-rules.md).
 *   3. Build the deployment ZIP and source archive.
 *   4. Compute SHA-256 checksums.
 *   5. Write the version snapshot to versions/<version>/.
 *   6. Upsert the manifest at versions/manifest.json.
 *   7. Update packages/index.json.
 *   8. Auto-invoke package-build-validate; roll back on failure.
 *
 * Exits 0 on success, non-zero on failure.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ErrorCode, PackageError } from './lib/errors';
import { GitContext } from './lib/git';
import { IndexManager } from './lib/index-manager';
import { ManifestManager } from './lib/manifest-manager';
import { Package } from './lib/package';
import { PackageValidator } from './lib/validate-package';
import { SnapshotValidator } from './lib/snapshot-validator';
import { ZipBuilder } from './lib/zip-builder';
import { Checksum } from './lib/checksum';

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
// Rollback helper
// ---------------------------------------------------------------------------

function rollback(versionDir: string): void {
  if (fs.existsSync(versionDir)) {
    try {
      fs.rmSync(versionDir, { recursive: true, force: true });
      console.error(`  [ROLLBACK] Removed partial version directory: ${versionDir}`);
    } catch {
      console.error(`  [ROLLBACK] Failed to remove: ${versionDir}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { packageId, forceRebuild } = parseArgs(process.argv);

  const repoRoot = path.resolve(__dirname, '..');
  const packagesDir = path.join(repoRoot, 'packages');
  const pkg = new Package(packageId, packagesDir);

  // Step 1: Internal validation
  console.log(`[1/8] Validating package: ${packageId}`);
  const report = new PackageValidator(packageId, packagesDir).validate();
  for (const w of report.warnings) {
    console.warn(`  [WARN]  ${w.message}`);
  }
  for (const e of report.errors) {
    console.error(`  [ERROR] (${e.code}) ${e.message}`);
  }
  if (!report.passed) {
    console.error(`Build aborted: validation failed for package "${packageId}"`);
    process.exit(1);
  }

  // Step 2: Read metadata to get target version
  const metadata = pkg.loadMetadata();
  const version = metadata.version;
  console.log(`[2/8] Target version: ${version}`);

  // Step 3: Overwrite-protection checks
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
        `[3/8] --force-rebuild on branch "${branch}": overwriting existing version "${version}"`,
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
    console.log(`[3/8] Overwrite check passed (new version)`);
  }

  // Step 4: Create version snapshot directory structure
  console.log(`[4/8] Building version snapshot for ${version}`);
  fs.mkdirSync(versionDir, { recursive: true });

  const snapshotMetaPath = path.join(versionDir, 'metadata.json');
  const deployZipPath = path.join(versionDir, `${version}.zip`);
  const srcZipPath = path.join(versionDir, `${version}-src.zip`);

  try {
    // Copy metadata.json verbatim
    fs.copyFileSync(pkg.metadataPath, snapshotMetaPath);

    // Copy agents/ tree
    if (fs.existsSync(pkg.agentsDir)) {
      const snapshotAgentsDir = path.join(versionDir, 'agents');
      fs.mkdirSync(snapshotAgentsDir, { recursive: true });
      for (const f of fs.readdirSync(pkg.agentsDir)) {
        fs.copyFileSync(path.join(pkg.agentsDir, f), path.join(snapshotAgentsDir, f));
      }
    }

    // Copy flows/ tree
    if (fs.existsSync(pkg.flowsDir)) {
      const snapshotFlowsDir = path.join(versionDir, 'flows');
      fs.mkdirSync(snapshotFlowsDir, { recursive: true });
      for (const f of fs.readdirSync(pkg.flowsDir)) {
        fs.copyFileSync(path.join(pkg.flowsDir, f), path.join(snapshotFlowsDir, f));
      }
    }

    // Step 5: Build deployment ZIP
    console.log(`[5/8] Building deployment ZIP: ${version}.zip`);
    const zipBuilder = new ZipBuilder(pkg.packageDir, version);
    zipBuilder.buildDeploymentZip(deployZipPath);

    // Build source archive
    console.log(`[6/8] Building source archive: ${version}-src.zip`);
    zipBuilder.buildSourceZip(srcZipPath);

    // Step 6: Compute checksums
    const deployZipSha256 = Checksum.sha256(deployZipPath);
    const srcZipSha256 = Checksum.sha256(srcZipPath);
    console.log(`       deploy sha256: ${deployZipSha256}`);
    console.log(`       src    sha256: ${srcZipSha256}`);

    // Step 7: Upsert manifest.json
    console.log(`[7/8] Updating versions/manifest.json`);
    const manifestManager = new ManifestManager(pkg.manifestPath, packageId);
    const manifest = manifestManager.load();
    const updatedManifest = manifestManager.upsert(manifest, {
      version,
      artifact: `${version}.zip`,
      sha256: deployZipSha256,
      srcArtifact: `${version}-src.zip`,
      srcSha256: srcZipSha256,
      createdAt: new Date().toISOString(),
    });
    manifestManager.save(updatedManifest);

    // Update packages/index.json
    const indexPath = path.join(repoRoot, 'packages', 'index.json');
    new IndexManager(indexPath).update(packageId, metadata, updatedManifest.latest);

    // Step 8: Auto-invoke package-build-validate
    console.log(`[8/8] Running package-build-validate`);
    const validateReport = new SnapshotValidator(packageId, version, packagesDir).validate();
    for (const w of validateReport.warnings) {
      console.warn(`  [WARN]  ${w.message}`);
    }
    for (const e of validateReport.errors) {
      console.error(`  [ERROR] (${e.code}) ${e.message}`);
    }
    if (!validateReport.passed) {
      rollback(versionDir);
      console.error(
        `Build validation failed for version "${version}". Changes rolled back.`,
      );
      process.exit(1);
    }
  } catch (error) {
    rollback(versionDir);
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

main().catch((error) => {
  if (error instanceof PackageError) {
    console.error(`[${error.code}] ${error.message}`);
  } else {
    console.error('Unexpected error during build:', error);
  }
  process.exit(1);
});
