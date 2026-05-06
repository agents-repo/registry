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

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import semver from 'semver';
import { ErrorCode, PackageError } from './lib/errors';
import { parseFrontmatter } from './lib/frontmatter';
import { getCurrentBranch, isProtectedBranch } from './lib/git';
import type {
  Manifest,
  ManifestVersionEntry,
  PackageIndex,
  PackageIndexEntry,
  PackageMetadata,
} from './lib/types';
import { validatePackage } from './lib/validate-package';
import { runBuildValidate } from './package-build-validate';

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
// SHA-256 helper
// ---------------------------------------------------------------------------

function sha256File(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ---------------------------------------------------------------------------
// ZIP builders
// ---------------------------------------------------------------------------

/**
 * Builds the deployment ZIP: only agents/<id>.agent.md entries for all
 * agents and flows in the package, with frontmatter version stamped to
 * match the release version.
 */
function buildDeploymentZip(
  packageDir: string,
  version: string,
  outputPath: string,
): void {
  const zip = new AdmZip();

  function addAgentMd(srcPath: string, entryName: string): void {
    let content = fs.readFileSync(srcPath, 'utf-8');
    const fm = parseFrontmatter(content);
    if (fm['version'] !== version) {
      // Stamp the correct version into frontmatter
      content = content.replace(
        /^(---\r?\n[\s\S]*?version:\s*)([^\r\n]+)/m,
        `$1${version}`,
      );
    }
    zip.addFile(entryName, Buffer.from(content, 'utf-8'));
  }

  const agentsDir = path.join(packageDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    for (const f of fs.readdirSync(agentsDir)) {
      if (f.endsWith('.agent.md')) {
        addAgentMd(path.join(agentsDir, f), `agents/${f}`);
      }
    }
  }

  const flowsDir = path.join(packageDir, 'flows');
  if (fs.existsSync(flowsDir)) {
    for (const f of fs.readdirSync(flowsDir)) {
      if (f.endsWith('.agent.md')) {
        // Flows are merged into agents/ in the deployment ZIP
        addAgentMd(path.join(flowsDir, f), `agents/${f}`);
      }
    }
  }

  zip.writeZip(outputPath);
}

/**
 * Builds the source archive ZIP: full package source except versions/.
 */
function buildSourceZip(
  packageDir: string,
  outputPath: string,
): void {
  const zip = new AdmZip();

  function addDir(dir: string, prefix: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'versions') continue;
      const fullPath = path.join(dir, entry.name);
      const zipName = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        addDir(fullPath, zipName);
      } else {
        zip.addFile(zipName, fs.readFileSync(fullPath));
      }
    }
  }

  addDir(packageDir, '');
  zip.writeZip(outputPath);
}

// ---------------------------------------------------------------------------
// Manifest helpers
// ---------------------------------------------------------------------------

function loadManifest(manifestPath: string, packageId: string): Manifest {
  if (fs.existsSync(manifestPath)) {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
  }
  return {
    schemaVersion: '1.0.0',
    name: packageId,
    latest: '',
    versions: [],
  };
}

function upsertManifestEntry(
  manifest: Manifest,
  entry: ManifestVersionEntry,
): Manifest {
  const existing = manifest.versions.findIndex(
    (v) => v.version === entry.version,
  );
  if (existing >= 0) {
    manifest.versions[existing] = entry;
  } else {
    manifest.versions.push(entry);
  }
  manifest.versions.sort((a, b) => semver.compare(a.version, b.version));
  const maxVer = semver.maxSatisfying(
    manifest.versions.map((v) => v.version),
    '*',
  );
  manifest.latest = maxVer ?? entry.version;
  return manifest;
}

// ---------------------------------------------------------------------------
// Index helpers
// ---------------------------------------------------------------------------

function updateIndex(
  indexPath: string,
  packageId: string,
  metadata: PackageMetadata,
  manifestLatest: string,
): void {
  let index: PackageIndex;
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as PackageIndex;
  } else {
    index = { schemaVersion: '1.0.0', updatedAt: '', packages: [] };
  }

  const entry: PackageIndexEntry = {
    id: packageId,
    name: metadata.name,
    description: metadata.description,
    latest: manifestLatest,
    tags: metadata.tags,
  };

  const existing = index.packages.findIndex((p) => p.id === packageId);
  if (existing >= 0) {
    index.packages[existing] = entry;
  } else {
    index.packages.push(entry);
    index.packages.sort((a, b) => a.id.localeCompare(b.id));
  }

  index.updatedAt = new Date().toISOString();
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 4) + '\n', 'utf-8');
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
  const packageDir = path.join(packagesDir, packageId);

  // Step 1: Internal validation
  console.log(`[1/8] Validating package: ${packageId}`);
  const report = validatePackage(packageId, packagesDir);
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
  const metadataPath = path.join(packageDir, 'metadata.json');
  const metadata = JSON.parse(
    fs.readFileSync(metadataPath, 'utf-8'),
  ) as PackageMetadata;
  const version = metadata.version;
  console.log(`[2/8] Target version: ${version}`);

  // Step 3: Overwrite-protection checks
  const versionDir = path.join(packageDir, 'versions', version);
  const versionExists = fs.existsSync(versionDir);

  if (versionExists) {
    const branch = await getCurrentBranch();
    if (forceRebuild) {
      if (isProtectedBranch(branch)) {
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
    fs.copyFileSync(metadataPath, snapshotMetaPath);

    // Copy agents/ tree
    const agentsDir = path.join(packageDir, 'agents');
    if (fs.existsSync(agentsDir)) {
      const snapshotAgentsDir = path.join(versionDir, 'agents');
      fs.mkdirSync(snapshotAgentsDir, { recursive: true });
      for (const f of fs.readdirSync(agentsDir)) {
        fs.copyFileSync(
          path.join(agentsDir, f),
          path.join(snapshotAgentsDir, f),
        );
      }
    }

    // Copy flows/ tree
    const flowsDir = path.join(packageDir, 'flows');
    if (fs.existsSync(flowsDir)) {
      const snapshotFlowsDir = path.join(versionDir, 'flows');
      fs.mkdirSync(snapshotFlowsDir, { recursive: true });
      for (const f of fs.readdirSync(flowsDir)) {
        fs.copyFileSync(
          path.join(flowsDir, f),
          path.join(snapshotFlowsDir, f),
        );
      }
    }

    // Step 5: Build deployment ZIP
    console.log(`[5/8] Building deployment ZIP: ${version}.zip`);
    buildDeploymentZip(packageDir, version, deployZipPath);

    // Build source archive
    console.log(`[6/8] Building source archive: ${version}-src.zip`);
    buildSourceZip(packageDir, srcZipPath);

    // Step 6: Compute checksums
    const deployZipSha256 = sha256File(deployZipPath);
    const srcZipSha256 = sha256File(srcZipPath);
    console.log(`       deploy sha256: ${deployZipSha256}`);
    console.log(`       src    sha256: ${srcZipSha256}`);

    // Step 7: Upsert manifest.json
    console.log(`[7/8] Updating versions/manifest.json`);
    const manifestPath = path.join(packageDir, 'versions', 'manifest.json');
    const manifest = loadManifest(manifestPath, packageId);
    const updatedManifest = upsertManifestEntry(manifest, {
      version,
      artifact: `${version}.zip`,
      sha256: deployZipSha256,
      srcArtifact: `${version}-src.zip`,
      srcSha256: srcZipSha256,
      createdAt: new Date().toISOString(),
    });
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(updatedManifest, null, 4) + '\n',
      'utf-8',
    );

    // Update packages/index.json
    const indexPath = path.join(repoRoot, 'packages', 'index.json');
    updateIndex(indexPath, packageId, metadata, updatedManifest.latest);

    // Step 8: Auto-invoke package-build-validate
    console.log(`[8/8] Running package-build-validate`);
    const validateReport = runBuildValidate(packageId, version, packagesDir);
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
