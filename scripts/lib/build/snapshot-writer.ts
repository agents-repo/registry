import fs from 'node:fs';
import path from 'node:path';
import { Package } from '../package';
import { AGENTS_DIR, FLOWS_DIR, METADATA_FILENAME, SOURCE_ARCHIVE_SUFFIX } from '../constants';

export interface SnapshotPaths {
  snapshotMetaPath: string;
  srcZipPath: string;
}

export function prepareVersionSnapshot(
  pkg: Package,
  versionDir: string,
  version: string,
): SnapshotPaths {
  fs.mkdirSync(versionDir, { recursive: true });

  const snapshotMetaPath = path.join(versionDir, METADATA_FILENAME);
  const srcZipPath = path.join(versionDir, `${version}${SOURCE_ARCHIVE_SUFFIX}`);

  fs.copyFileSync(pkg.metadataPath, snapshotMetaPath);

  if (fs.existsSync(pkg.agentsDir)) {
    const snapshotAgentsDir = path.join(versionDir, AGENTS_DIR);
    fs.mkdirSync(snapshotAgentsDir, { recursive: true });
    for (const fileName of fs.readdirSync(pkg.agentsDir)) {
      fs.copyFileSync(path.join(pkg.agentsDir, fileName), path.join(snapshotAgentsDir, fileName));
    }
  }

  if (fs.existsSync(pkg.flowsDir)) {
    const snapshotFlowsDir = path.join(versionDir, FLOWS_DIR);
    fs.mkdirSync(snapshotFlowsDir, { recursive: true });
    for (const fileName of fs.readdirSync(pkg.flowsDir)) {
      fs.copyFileSync(path.join(pkg.flowsDir, fileName), path.join(snapshotFlowsDir, fileName));
    }
  }

  return { snapshotMetaPath, srcZipPath };
}
