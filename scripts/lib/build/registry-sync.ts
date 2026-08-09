import fs from 'node:fs';
import { cloneJson, readTextFileIfExists } from '../io/json';
import { IndexManager } from '../index-manager';
import { ManifestManager } from '../manifest-manager';
import { toManifestArtifactEntry, type BuiltTargetArtifact } from '../emitters/target-zip-builder';
import type { ManifestVersionEntry, PackageMetadata, PackageRef } from '../types';
import {
  INSTRUCTIONS_FILENAME,
  SCHEMA_FAMILY_MANIFEST,
  SOURCE_ARCHIVE_SUFFIX,
} from '../constants';
import { getSchemaCurrentVersion } from '../schema-versions';

export function updateManifestAndIndexWithRollback(opts: {
  ref: PackageRef;
  manifestPath: string;
  indexPath: string;
  packagesDir: string;
  metadata: PackageMetadata;
  version: string;
  artifacts: BuiltTargetArtifact[];
  srcZipSha256: string;
  instructionsSha256?: string;
}): void {
  const {
    ref,
    manifestPath,
    indexPath,
    packagesDir,
    metadata,
    version,
    artifacts,
    srcZipSha256,
    instructionsSha256,
  } = opts;

  const manifestArtifacts = artifacts.map(toManifestArtifactEntry);

  const manifestManager = new ManifestManager(manifestPath, ref.packageId);
  const manifest = manifestManager.load();
  const oldManifest = cloneJson(manifest);

  const versionEntry: ManifestVersionEntry = {
    version,
    srcArtifact: `${version}${SOURCE_ARCHIVE_SUFFIX}`,
    srcSha256: srcZipSha256,
    artifacts: manifestArtifacts,
    createdAt: new Date().toISOString(),
  };

  if (instructionsSha256 !== undefined) {
    versionEntry.instructionsArtifact = INSTRUCTIONS_FILENAME;
    versionEntry.instructionsSha256 = instructionsSha256;
  }

  const updatedManifest = manifestManager.upsert(manifest, versionEntry);
  updatedManifest.schemaVersion = getSchemaCurrentVersion(SCHEMA_FAMILY_MANIFEST);
  manifestManager.save(updatedManifest);

  const latestVersionEntry = updatedManifest.versions.find(
    (entry) => entry.version === updatedManifest.latest,
  );
  if (latestVersionEntry === undefined) {
    throw new Error(
      `manifest upsert did not retain entry for latest version ${updatedManifest.latest}`,
    );
  }

  const oldIndexContent = readTextFileIfExists(indexPath);

  try {
    new IndexManager(indexPath, packagesDir).update(
      ref,
      metadata,
      updatedManifest.latest,
      latestVersionEntry.artifacts,
      { latestVersionEntry },
    );
  } catch (indexError) {
    try {
      manifestManager.save(oldManifest);
      console.error('  [ROLLBACK] Restored versions/manifest.json after index update failure');
    } catch (restoreError) {
      console.error('  [ROLLBACK] Failed to restore versions/manifest.json:', restoreError);
    }

    try {
      if (oldIndexContent !== null) {
        fs.writeFileSync(indexPath, oldIndexContent, 'utf-8');
      } else if (fs.existsSync(indexPath)) {
        fs.unlinkSync(indexPath);
      }
      console.error('  [ROLLBACK] Restored packages/index.json after index update failure');
    } catch (restoreError) {
      console.error('  [ROLLBACK] Failed to restore packages/index.json:', restoreError);
    }

    throw indexError;
  }
}
