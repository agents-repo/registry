#!/usr/bin/env tsx

import { resolveScriptPaths } from './lib/cli';
import { DETAIL_FILENAME } from './lib/constants';
import { PackageError } from './lib/errors';
import { backfillPackages } from './lib/readme-backfill-run';

function main(): void {
  const { packagesDir } = resolveScriptPaths(import.meta.url);
  const summary = backfillPackages(packagesDir);
  console.log(
    `README backfill complete: ${summary.written} written, ${summary.skippedExists} already present, ${summary.skippedMissing} missing from src.zip, ${summary.detailsWritten} ${DETAIL_FILENAME} refreshed`,
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
