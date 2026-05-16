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
import { ErrorCode, PackageError } from './lib/errors';
import { GitContext } from './lib/git';
import { IndexManager } from './lib/index-manager';
import { ManifestManager } from './lib/manifest-manager';
import { Package } from './lib/package';
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

  const repoRoot = path.resolve(scriptDir, '..');
  const packagesDir = path.join(repoRoot, 'packages');
  const pkg = new Package(packageId, packagesDir);

  // Step 1: Read metadata to get target version
  const metadata = pkg.loadMetadata();
  const version = metadata.version;
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
    const manifestManager = new ManifestManager(pkg.manifestPath, packageId);
    const manifest = manifestManager.load();
    const oldManifest = JSON.parse(JSON.stringify(manifest)); // Deep copy for rollback
    
    const updatedManifest = manifestManager.upsert(manifest, {
      version,
      artifact: `${version}.zip`,
      sha256: deployZipSha256,
      srcArtifact: `${version}-src.zip`,
      srcSha256: srcZipSha256,
      createdAt: new Date().toISOString(),
    });
    manifestManager.save(updatedManifest);
    
    // Prepare index update with rollback support
    const indexPath = path.join(repoRoot, 'packages', 'index.json');
    const oldIndexContent = fs.existsSync(indexPath) 
      ? fs.readFileSync(indexPath, 'utf-8') 
      : null;
    
    try {
      new IndexManager(indexPath).update(packageId, metadata, updatedManifest.latest);
    } catch (indexError) {
      // Rollback manifest if index update fails
      try {
        manifestManager.save(oldManifest);
        console.error(`  [ROLLBACK] Restored versions/manifest.json after index update failure`);
      } catch (restoreError) {
        console.error(`  [ROLLBACK] Failed to restore versions/manifest.json:`, restoreError);
      }
      throw indexError;
    }
  } catch (error) {
    rollback(versionDir);
    
    // Attempt to restore old index.json if it was overwritten
    const indexPath = path.join(repoRoot, 'packages', 'index.json');
    if (fs.existsSync(indexPath)) {
      try {
        // Try to detect and restore old index if needed
        const currentIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        if (currentIndex[packageId] !== undefined) {
          // Index was partially updated; this needs manual intervention
          console.error(
            `  [CRITICAL] packages/index.json may be inconsistent. ` +
              `Review the index for package "${packageId}" and ensure it matches versions/manifest.json.`
          );
        }
      } catch {
        // Index JSON is malformed; leave for user to diagnose
      }
    }
    
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
