#!/usr/bin/env tsx
/**
 * package-scan-zips — Repo-wide audit for generated package snapshot ZIPs.
 *
 * Usage:
 *   npm run package:scan-zips
 *
 * Scans every generated version snapshot under packages/<namespace>/<id>/versions/<version>
 * and validates both deployment and source ZIP artifacts using the existing
 * snapshot validation flow.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import semver from 'semver';
import { parseReleaseVersion, resolveScriptPaths } from './lib/cli';
import { SnapshotValidator } from './lib/snapshot-validator';
import { listDiscoveredPackages } from './lib/namespace';
import type { ValidationReport } from './lib/types';
import { VERSIONS_DIR } from './lib/constants';

export interface PackageSnapshotTarget {
  qualifiedRef: string;
  version: string;
}

export interface PackageSnapshotScanResult {
  target: PackageSnapshotTarget;
  report: ValidationReport;
}

export type SnapshotValidatorFactory = (
  qualifiedRef: string,
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

  for (const { ref, packageDir } of listDiscoveredPackages(packagesDir)) {
    const versionsDir = path.join(packageDir, VERSIONS_DIR);
    if (!fs.existsSync(versionsDir)) {
      continue;
    }

    for (const versionEntry of fs.readdirSync(versionsDir, { withFileTypes: true })) {
      if (!versionEntry.isDirectory()) {
        continue;
      }

      const version = parseReleaseVersion(versionEntry.name);
      if (version === null || version !== versionEntry.name) {
        continue;
      }

      targets.push({ qualifiedRef: ref.qualifiedId, version });
    }
  }

  return targets.sort(
    (left, right) =>
      left.qualifiedRef.localeCompare(right.qualifiedRef) ||
      semver.compare(left.version, right.version),
  );
}

export function scanPackageSnapshotTargets(
  packagesDir: string,
  targets: PackageSnapshotTarget[],
  validatorFactory: SnapshotValidatorFactory = (
    qualifiedRef: string,
    version: string,
    rootPackagesDir: string,
  ) => new SnapshotValidator(qualifiedRef, version, rootPackagesDir),
): PackageSnapshotScanResult[] {
  return targets.map((target) => ({
    target,
    report: validatorFactory(target.qualifiedRef, target.version, packagesDir).validate(),
  }));
}

function printReport(result: PackageSnapshotScanResult): void {
  const label = `${result.target.qualifiedRef}@${result.target.version}`;
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
    const searchedPath = path.join(packagesDir, '<namespace>', '<package-id>', VERSIONS_DIR, '<version>');
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
    console.error('\nPackage snapshot scan failed.');
    process.exit(1);
  }

  console.log(`\nPackage snapshot scan passed (${results.length} snapshot(s)).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
