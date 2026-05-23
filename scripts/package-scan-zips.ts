#!/usr/bin/env tsx
/**
 * package-scan-zips — Repo-wide audit for generated package snapshot ZIPs.
 *
 * Usage:
 *   npm run package:scan-zips
 *
 * Scans every generated version snapshot under packages/<id>/versions/<version> and
 * validates both deployment and source ZIP artifacts using the existing
 * snapshot validation flow.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import semver from 'semver';
import { parseReleaseVersion, resolveScriptPaths } from './lib/cli';
import { SnapshotValidator } from './lib/snapshot-validator';
import type { ValidationReport } from './lib/types';
import { VERSIONS_DIR } from './lib/constants';

export interface PackageSnapshotTarget {
  packageId: string;
  version: string;
}

export interface PackageSnapshotScanResult {
  target: PackageSnapshotTarget;
  report: ValidationReport;
}

export type SnapshotValidatorFactory = (
  packageId: string,
  version: string,
  packagesDir: string,
) => {
  validate(): ValidationReport;
};

export function collectPackageSnapshotTargets(packagesDir: string): PackageSnapshotTarget[] {
  const targets: PackageSnapshotTarget[] = [];

  if (!fs.existsSync(packagesDir)) {
    return targets;
  }

  for (const packageEntry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!packageEntry.isDirectory()) {
      continue;
    }

    const packageId = packageEntry.name;
    const versionsDir = path.join(packagesDir, packageId, VERSIONS_DIR);
    if (!fs.existsSync(versionsDir)) {
      continue;
    }

    for (const versionEntry of fs.readdirSync(versionsDir, { withFileTypes: true })) {
      if (!versionEntry.isDirectory()) {
        continue;
      }

      const version = parseReleaseVersion(versionEntry.name);
      // Snapshot directories MUST use canonical release names (e.g. 1.0.0).
      // Reject names that only parse after normalization (e.g. v1.0.0).
      if (version === null || version !== versionEntry.name) {
        continue;
      }

      targets.push({ packageId, version });
    }
  }

  return targets.sort(
    (left, right) =>
      left.packageId.localeCompare(right.packageId) ||
      semver.compare(left.version, right.version),
  );
}

export function scanPackageSnapshotTargets(
  packagesDir: string,
  targets: PackageSnapshotTarget[],
  validatorFactory: SnapshotValidatorFactory = (
    packageId: string,
    version: string,
    rootPackagesDir: string,
  ) => new SnapshotValidator(packageId, version, rootPackagesDir),
): PackageSnapshotScanResult[] {
  return targets.map((target) => ({
    target,
    report: validatorFactory(target.packageId, target.version, packagesDir).validate(),
  }));
}

function printReport(result: PackageSnapshotScanResult): void {
  const label = `${result.target.packageId}@${result.target.version}`;
  console.log(`Validating ${label}`);

  for (const warning of result.report.warnings) {
    console.warn(`  [WARN]  [${label}] ${warning.message}`);
  }

  for (const error of result.report.errors) {
    console.error(`  [ERROR] [${label}] (${error.code}) ${error.message}`);
  }
}

function main(): void {
  const { packagesDir } = resolveScriptPaths(import.meta.url);
  const targets = collectPackageSnapshotTargets(packagesDir);

  if (targets.length === 0) {
    const searchedPath = path.join(packagesDir, '*', VERSIONS_DIR, '<version>');
    console.log(`No package snapshots found under ${searchedPath}`);
    process.exit(0);
  }

  const results = scanPackageSnapshotTargets(packagesDir, targets);
  let hasErrors = false;

  for (const result of results) {
    printReport(result);
    if (!result.report.passed) {
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error(`Package ZIP scan failed for ${results.length} version snapshot(s)`);
    process.exit(1);
  }

  console.log(`Package ZIP scan passed for ${results.length} version snapshot(s)`);
}

const invokedPath = process.argv.at(1);
const isDirectExecution =
  typeof invokedPath === 'string' &&
  invokedPath.length > 0 &&
  import.meta.url === pathToFileURL(path.resolve(invokedPath)).href;

if (isDirectExecution) {
  main();
}
