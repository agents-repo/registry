#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import { parseReleaseVersion, resolveScriptPaths } from './lib/cli';
import {
  INDEX_FILENAME,
  MANIFEST_FILENAME,
  METADATA_FILENAME,
  SCHEMA_FAMILY_INDEX,
  VERSIONS_DIR,
} from './lib/constants';
import { ErrorCode, PackageError } from './lib/errors';
import { IndexManager } from './lib/index-manager';
import { readJsonFile, writeJsonFile } from './lib/io/json';
import { getSchemaCurrentVersion } from './lib/schema-versions';
import type { Manifest, PackageMetadata } from './lib/types';

function listEligiblePackageIds(packagesDir: string): string[] {
  const entries = fs.readdirSync(packagesDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((packageId) => {
      const packageDir = path.join(packagesDir, packageId);
      const metadataPath = path.join(packageDir, METADATA_FILENAME);
      const manifestPath = path.join(packageDir, VERSIONS_DIR, MANIFEST_FILENAME);
      return fs.existsSync(metadataPath) && fs.existsSync(manifestPath);
    })
    .sort((a, b) => a.localeCompare(b));
}

function writeEmptyIndex(indexPath: string): void {
  writeJsonFile(indexPath, {
    schemaVersion: getSchemaCurrentVersion(SCHEMA_FAMILY_INDEX),
    updatedAt: new Date().toISOString(),
    packages: [],
  });
}

function main(): void {
  const { packagesDir } = resolveScriptPaths(import.meta.url);
  const indexPath = path.join(packagesDir, INDEX_FILENAME);
  const packageIds = listEligiblePackageIds(packagesDir);

  if (fs.existsSync(indexPath)) {
    fs.unlinkSync(indexPath);
  }

  if (packageIds.length === 0) {
    writeEmptyIndex(indexPath);
    console.log('Rebuilt packages/index.json with 0 package entries');
    return;
  }

  const manager = new IndexManager(indexPath);

  for (const packageId of packageIds) {
    const packageDir = path.join(packagesDir, packageId);
    const metadataPath = path.join(packageDir, METADATA_FILENAME);
    const manifestPath = path.join(packageDir, VERSIONS_DIR, MANIFEST_FILENAME);

    const metadata = readJsonFile<PackageMetadata>(metadataPath);
    const manifest = readJsonFile<Manifest>(manifestPath);
    const latest = parseReleaseVersion(manifest.latest);

    if (latest === null) {
      throw new PackageError(
        ErrorCode.ERR_VALIDATION_FAILED,
        `versions/${MANIFEST_FILENAME} latest for package "${packageId}" must be a MAJOR.MINOR.PATCH release version`,
      );
    }

    manager.update(packageId, metadata, latest);
  }

  console.log(`Rebuilt packages/index.json with ${packageIds.length} package entries`);
}

try {
  main();
} catch (error) {
  if (error instanceof PackageError) {
    console.error(`[${error.code}] ${error.message}`);
  } else {
    console.error('Unexpected error during index rebuild:', error);
  }
  process.exit(1);
}
