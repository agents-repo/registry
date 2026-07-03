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
import { listDiscoveredPackages } from './lib/namespace';
import { getSchemaCurrentVersion } from './lib/schema-versions';
import { writePackageTree } from './lib/tree-manager';
import type { Manifest, PackageMetadata } from './lib/types';

function writeEmptyIndex(packagesDir: string, indexPath: string): void {
  writeJsonFile(indexPath, {
    schemaVersion: getSchemaCurrentVersion(SCHEMA_FAMILY_INDEX),
    updatedAt: new Date().toISOString(),
    aliases: {},
    packages: [],
  });
  writePackageTree(packagesDir, []);
}

function main(): void {
  const { packagesDir } = resolveScriptPaths(import.meta.url);
  const indexPath = path.join(packagesDir, INDEX_FILENAME);
  const discovered = listDiscoveredPackages(packagesDir);

  if (fs.existsSync(indexPath)) {
    fs.unlinkSync(indexPath);
  }

  if (discovered.length === 0) {
    writeEmptyIndex(packagesDir, indexPath);
    console.log('Rebuilt packages/index.json with 0 package entries');
    return;
  }

  const manager = new IndexManager(indexPath, packagesDir);

  for (const { ref, packageDir } of discovered) {
    const metadataPath = path.join(packageDir, METADATA_FILENAME);
    const manifestPath = path.join(packageDir, VERSIONS_DIR, MANIFEST_FILENAME);

    const metadata = readJsonFile<PackageMetadata>(metadataPath);
    const manifest = readJsonFile<Manifest>(manifestPath);
    const latest = parseReleaseVersion(manifest.latest);

    if (latest === null) {
      throw new PackageError(
        ErrorCode.ERR_VALIDATION_FAILED,
        `versions/${MANIFEST_FILENAME} latest for package "${ref.qualifiedId}" must be a MAJOR.MINOR.PATCH release version`,
      );
    }

    const latestEntry = manifest.versions.find((entry) => entry.version === latest);
    if (latestEntry === undefined) {
      throw new PackageError(
        ErrorCode.ERR_VALIDATION_FAILED,
        `versions/${MANIFEST_FILENAME} for package "${ref.qualifiedId}" is missing entry for latest version "${latest}"`,
      );
    }

    manager.update(ref, metadata, latest, latestEntry.artifacts);
  }

  console.log(`Rebuilt packages/index.json with ${discovered.length} package entries`);
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
