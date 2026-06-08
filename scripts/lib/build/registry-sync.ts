import fs from 'node:fs';
import { cloneJson, readTextFileIfExists } from '../io/json';
import { IndexManager } from '../index-manager';
import { ManifestManager } from '../manifest-manager';
import { toManifestArtifactEntry, type BuiltTargetArtifact } from '../emitters/target-zip-builder';
import type { PackageMetadata } from '../types';
import { SOURCE_ARCHIVE_SUFFIX } from '../constants';

export function updateManifestAndIndexWithRollback(opts: {
  packageId: string;
  manifestPath: string;
  indexPath: string;
  metadata: PackageMetadata;
  version: string;
  artifacts: BuiltTargetArtifact[];
  srcZipSha256: string;
}): void {
  const {
    packageId,
    manifestPath,
    indexPath,
    metadata,
    version,
    artifacts,
    srcZipSha256,
  } = opts;

  const manifestArtifacts = artifacts.map(toManifestArtifactEntry);

  const manifestManager = new ManifestManager(manifestPath, packageId);
  const manifest = manifestManager.load();
  const oldManifest = cloneJson(manifest);

  const updatedManifest = manifestManager.upsert(manifest, {
    version,
    srcArtifact: `${version}${SOURCE_ARCHIVE_SUFFIX}`,
    srcSha256: srcZipSha256,
    artifacts: manifestArtifacts,
    createdAt: new Date().toISOString(),
  });
  manifestManager.save(updatedManifest);

  const oldIndexContent = readTextFileIfExists(indexPath);

  try {
    new IndexManager(indexPath).update(packageId, metadata, updatedManifest.latest, manifestArtifacts);
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
