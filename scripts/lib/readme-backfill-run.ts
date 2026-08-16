import path from 'node:path';
import { parseReleaseVersion } from './cli';
import { MANIFEST_FILENAME, README_FILENAME, VERSIONS_DIR } from './constants';
import { ErrorCode, PackageError } from './errors';
import { readJsonFile } from './io/json';
import { listDiscoveredPackages } from './namespace';
import { writePackageDetailJson } from './package-detail-builder';
import { backfillSnapshotReadmeFromSrcZip } from './readme-backfill';
import type { Manifest, PackageRef } from './types';

export interface ReadmeBackfillSummary {
  written: number;
  skippedExists: number;
  skippedMissing: number;
  detailsWritten: number;
}

function refreshLatestPackageDetail(ref: PackageRef, packageDir: string, manifest: Manifest): void {
  const latest = parseReleaseVersion(manifest.latest);
  if (latest === null) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `versions/${MANIFEST_FILENAME} latest for package "${ref.qualifiedId}" must be a MAJOR.MINOR.PATCH release version`,
    );
  }

  writePackageDetailJson(ref, packageDir, latest, manifest);
}

export function backfillPackages(packagesDir: string): ReadmeBackfillSummary {
  const discovered = listDiscoveredPackages(packagesDir);
  const summary: ReadmeBackfillSummary = {
    written: 0,
    skippedExists: 0,
    skippedMissing: 0,
    detailsWritten: 0,
  };

  for (const { ref, packageDir } of discovered) {
    const manifestPath = path.join(packageDir, VERSIONS_DIR, MANIFEST_FILENAME);
    const manifest = readJsonFile<Manifest>(manifestPath);

    for (const entry of manifest.versions) {
      const version = parseReleaseVersion(entry.version);
      if (version === null) {
        throw new PackageError(
          ErrorCode.ERR_VALIDATION_FAILED,
          `versions/${MANIFEST_FILENAME} version for package "${ref.qualifiedId}" must be a MAJOR.MINOR.PATCH release version`,
        );
      }

      const versionDir = path.join(packageDir, VERSIONS_DIR, version);
      const result = backfillSnapshotReadmeFromSrcZip(versionDir, version);
      if (result === 'written') {
        summary.written += 1;
        console.log(`Wrote ${ref.qualifiedId} ${VERSIONS_DIR}/${version}/${README_FILENAME}`);
      } else if (result === 'skipped-exists') {
        summary.skippedExists += 1;
      } else {
        summary.skippedMissing += 1;
      }
    }

    refreshLatestPackageDetail(ref, packageDir, manifest);
    summary.detailsWritten += 1;
  }

  return summary;
}
