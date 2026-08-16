#!/usr/bin/env tsx

import path from 'node:path';
import { parseReleaseVersion, resolveScriptPaths } from './lib/cli';
import { MANIFEST_FILENAME, README_FILENAME, VERSIONS_DIR } from './lib/constants';
import { ErrorCode, PackageError } from './lib/errors';
import { readJsonFile } from './lib/io/json';
import { listDiscoveredPackages } from './lib/namespace';
import { backfillSnapshotReadmeFromSrcZip } from './lib/readme-backfill';
import type { Manifest } from './lib/types';

function main(): void {
  const { packagesDir } = resolveScriptPaths(import.meta.url);
  const discovered = listDiscoveredPackages(packagesDir);
  let written = 0;
  let skippedExists = 0;
  let skippedMissing = 0;

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
        written += 1;
        console.log(`Wrote ${ref.qualifiedId} ${VERSIONS_DIR}/${version}/${README_FILENAME}`);
      } else if (result === 'skipped-exists') {
        skippedExists += 1;
      } else {
        skippedMissing += 1;
      }
    }
  }

  console.log(
    `README backfill complete: ${written} written, ${skippedExists} already present, ${skippedMissing} missing from src.zip`,
  );
}

try {
  main();
} catch (error) {
  if (error instanceof PackageError) {
    console.error(`[${error.code}] ${error.message}`);
  } else {
    console.error('Unexpected error during README backfill:', error);
  }
  process.exit(1);
}
