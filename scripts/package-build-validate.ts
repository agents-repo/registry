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
 * This script is also called automatically by package-build after each build.
 * On failure, package-build rolls back the version snapshot.
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

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import semver from 'semver';
import { parseFrontmatter } from './lib/frontmatter';
import type { Manifest, ValidationIssue, ValidationReport } from './lib/types';

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
// Helpers
// ---------------------------------------------------------------------------

function errIssue(code: string, message: string): ValidationIssue {
  return { code, severity: 'error', message };
}

function warnIssue(message: string): ValidationIssue {
  return { code: 'WARN', severity: 'warning', message };
}

function sha256File(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ---------------------------------------------------------------------------
// ZIP security and structural scanner
// ---------------------------------------------------------------------------

const DISALLOWED_SOURCE_EXTENSIONS = new Set([
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.sh',
  '.bash',
  '.bat',
  '.cmd',
  '.ps1',
  '.py',
  '.rb',
  '.pl',
  '.php',
  '.jar',
  '.class',
]);

function scanZip(
  zipPath: string,
  opts: {
    type: 'deployment' | 'source';
    expectedVersion: string;
  },
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  let zip: AdmZip;
  try {
    zip = new AdmZip(zipPath);
  } catch (e) {
    return [errIssue('ERR_ZIP_MALFORMED_ENTRY', `Cannot open ZIP: ${zipPath} — ${e}`)];
  }

  const entries = zip.getEntries();
  const seenExact = new Set<string>();
  const seenLower = new Set<string>();

  for (const entry of entries) {
    const name = entry.entryName;

    // Skip directory entries
    if (name.endsWith('/')) continue;

    // Malformed: empty or excessively long
    if (name.length === 0 || name.length > 4096) {
      issues.push(errIssue('ERR_ZIP_MALFORMED_ENTRY', `Malformed ZIP entry name length: "${name}"`));
      continue;
    }

    // Path traversal: null byte, double dot, absolute path, backslash
    if (
      name.includes('\0') ||
      name.split('/').some((seg) => seg === '..') ||
      name.startsWith('/') ||
      name.includes('\\')
    ) {
      issues.push(
        errIssue(
          'ERR_ZIP_TRAVERSAL',
          `Path traversal detected in ZIP entry: "${name}"`,
        ),
      );
      continue;
    }

    // Symlink detection via Unix external file attributes (high 16 bits)
    const unixMode = (entry.attr >>> 16) & 0xffff;
    if (unixMode !== 0 && (unixMode & 0xf000) === 0xa000) {
      issues.push(
        errIssue('ERR_ZIP_SYMLINK', `Symlink entry detected in ZIP: "${name}"`),
      );
      continue;
    }

    // Case-exact duplicate check
    if (seenExact.has(name)) {
      issues.push(
        errIssue('ERR_ZIP_COLLISION', `Duplicate ZIP entry: "${name}"`),
      );
    } else {
      seenExact.add(name);
    }

    // Case-collision check
    const lower = name.toLowerCase();
    if (seenLower.has(lower) && !seenExact.has(name)) {
      issues.push(
        errIssue(
          'ERR_ZIP_COLLISION',
          `Case-collision ZIP entry: "${name}" collides with an existing entry`,
        ),
      );
    }
    seenLower.add(lower);

    // Deployment ZIP: only agents/<id>.agent.md entries allowed
    if (opts.type === 'deployment') {
      if (!/^agents\/[a-z0-9]+(?:-[a-z0-9]+)*\.agent\.md$/.test(name)) {
        issues.push(
          errIssue(
            'ERR_ZIP_UNEXPECTED_ENTRY',
            `Unexpected entry in deployment ZIP: "${name}" — only agents/<id>.agent.md is allowed`,
          ),
        );
        continue;
      }

      // Check frontmatter version
      try {
        const content = entry.getData().toString('utf-8');
        const fm = parseFrontmatter(content);
        if (fm['version'] !== opts.expectedVersion) {
          issues.push(
            errIssue(
              'ERR_FRONTMATTER_VERSION_MISMATCH',
              `Deployment ZIP entry "${name}": frontmatter version "${fm['version']}" must be "${opts.expectedVersion}"`,
            ),
          );
        }
      } catch {
        issues.push(
          errIssue(
            'ERR_ZIP_MALFORMED_ENTRY',
            `Cannot read content of deployment ZIP entry: "${name}"`,
          ),
        );
      }
    }

    // Source ZIP checks
    if (opts.type === 'source') {
      // versions/ MUST NOT be in source archive
      if (name.startsWith('versions/') || name === 'versions') {
        issues.push(
          errIssue(
            'ERR_ZIP_VERSIONS_INCLUDED',
            `Source ZIP must not include versions/ — found entry: "${name}"`,
          ),
        );
        continue;
      }

      // Disallowed binary extensions
      const ext = name.includes('.')
        ? name.slice(name.lastIndexOf('.')).toLowerCase()
        : '';
      if (DISALLOWED_SOURCE_EXTENSIONS.has(ext)) {
        issues.push(
          errIssue(
            'ERR_ZIP_DISALLOWED_PAYLOAD',
            `Disallowed file extension "${ext}" in source ZIP: "${name}"`,
          ),
        );
      }

      // Frontmatter version check for .agent.md files
      if (name.endsWith('.agent.md')) {
        try {
          const content = entry.getData().toString('utf-8');
          const fm = parseFrontmatter(content);
          if (fm['version'] !== opts.expectedVersion) {
            issues.push(
              errIssue(
                'ERR_FRONTMATTER_VERSION_MISMATCH',
                `Source ZIP entry "${name}": frontmatter version "${fm['version']}" must be "${opts.expectedVersion}"`,
              ),
            );
          }
        } catch {
          issues.push(
            errIssue(
              'ERR_ZIP_MALFORMED_ENTRY',
              `Cannot read content of source ZIP entry: "${name}"`,
            ),
          );
        }
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Exported function for use by package-build
// ---------------------------------------------------------------------------

export function runBuildValidate(
  packageId: string,
  version: string,
  packagesDir: string,
): ValidationReport {
  const issues: ValidationIssue[] = [];

  const packageDir = path.join(packagesDir, packageId);
  const versionDir = path.join(packageDir, 'versions', version);
  const manifestPath = path.join(packageDir, 'versions', 'manifest.json');

  // 1. Version directory exists
  if (!fs.existsSync(versionDir)) {
    return {
      packageId,
      errors: [
        errIssue(
          'ERR_PACKAGE_NOT_FOUND',
          `Version snapshot directory not found: ${versionDir}`,
        ),
      ],
      warnings: [],
      passed: false,
    };
  }

  // 2. Expected files present
  const deployZipPath = path.join(versionDir, `${version}.zip`);
  const srcZipPath = path.join(versionDir, `${version}-src.zip`);
  const snapshotMetaPath = path.join(versionDir, 'metadata.json');

  if (!fs.existsSync(deployZipPath)) {
    issues.push(errIssue('ERR_VALIDATION_FAILED', `Missing deployment ZIP: ${version}.zip`));
  }
  if (!fs.existsSync(srcZipPath)) {
    issues.push(errIssue('ERR_VALIDATION_FAILED', `Missing source archive: ${version}-src.zip`));
  }
  if (!fs.existsSync(snapshotMetaPath)) {
    issues.push(errIssue('ERR_VALIDATION_FAILED', `Missing snapshot metadata.json`));
  }

  // 3. No unexpected files in the version snapshot directory
  const allowedTopLevelEntries = new Set([
    'metadata.json',
    `${version}.zip`,
    `${version}-src.zip`,
    'agents',
    'flows',
  ]);
  for (const entry of fs.readdirSync(versionDir)) {
    if (!allowedTopLevelEntries.has(entry)) {
      issues.push(
        errIssue(
          'ERR_MANUAL_MUTATION',
          `Unexpected file in version snapshot directory: "${entry}" — only script-generated files are allowed`,
        ),
      );
    }
  }

  // 4. Validate manifest exists and contains this version
  if (!fs.existsSync(manifestPath)) {
    issues.push(errIssue('ERR_VALIDATION_FAILED', `versions/manifest.json not found`));
  } else {
    let manifest: Manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
    } catch {
      issues.push(errIssue('ERR_VALIDATION_FAILED', `versions/manifest.json is not valid JSON`));
      const errors = issues.filter((i) => i.severity === 'error');
      const warnings = issues.filter((i) => i.severity === 'warning');
      return { packageId, errors, warnings, passed: errors.length === 0 };
    }

    const entry = manifest.versions.find((v) => v.version === version);
    if (!entry) {
      issues.push(
        errIssue(
          'ERR_VALIDATION_FAILED',
          `Version "${version}" not found in manifest.json`,
        ),
      );
    } else {
      // 5. Checksum verification
      if (fs.existsSync(deployZipPath)) {
        const actualDeployHash = sha256File(deployZipPath);
        if (actualDeployHash !== entry.sha256) {
          issues.push(
            errIssue(
              'ERR_CHECKSUM_MISMATCH',
              `Deployment ZIP sha256 mismatch for version "${version}": ` +
                `manifest has "${entry.sha256}", computed "${actualDeployHash}"`,
            ),
          );
        }
      }

      if (fs.existsSync(srcZipPath)) {
        const actualSrcHash = sha256File(srcZipPath);
        if (actualSrcHash !== entry.srcSha256) {
          issues.push(
            errIssue(
              'ERR_CHECKSUM_MISMATCH',
              `Source archive sha256 mismatch for version "${version}": ` +
                `manifest has "${entry.srcSha256}", computed "${actualSrcHash}"`,
            ),
          );
        }
      }
    }
  }

  // 6. Deep deployment ZIP scan
  if (fs.existsSync(deployZipPath)) {
    const zipIssues = scanZip(deployZipPath, {
      type: 'deployment',
      expectedVersion: version,
    });
    issues.push(...zipIssues);
  }

  // 7. Deep source archive scan
  if (fs.existsSync(srcZipPath)) {
    const zipIssues = scanZip(srcZipPath, {
      type: 'source',
      expectedVersion: version,
    });
    issues.push(...zipIssues);
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  return { packageId, errors, warnings, passed: errors.length === 0 };
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

main();
