import fs from 'node:fs';
import path from 'node:path';
import { Package } from '../package';

export interface SnapshotPaths {
  snapshotMetaPath: string;
  deployZipPath: string;
  srcZipPath: string;
}

export function prepareVersionSnapshot(
  pkg: Package,
  versionDir: string,
  version: string,
): SnapshotPaths {
  fs.mkdirSync(versionDir, { recursive: true });

  const snapshotMetaPath = path.join(versionDir, 'metadata.json');
  const deployZipPath = path.join(versionDir, `${version}.zip`);
  const srcZipPath = path.join(versionDir, `${version}-src.zip`);

  fs.copyFileSync(pkg.metadataPath, snapshotMetaPath);

  if (fs.existsSync(pkg.agentsDir)) {
    const snapshotAgentsDir = path.join(versionDir, 'agents');
    fs.mkdirSync(snapshotAgentsDir, { recursive: true });
    for (const fileName of fs.readdirSync(pkg.agentsDir)) {
      fs.copyFileSync(path.join(pkg.agentsDir, fileName), path.join(snapshotAgentsDir, fileName));
    }
  }

  if (fs.existsSync(pkg.flowsDir)) {
    const snapshotFlowsDir = path.join(versionDir, 'flows');
    fs.mkdirSync(snapshotFlowsDir, { recursive: true });
    for (const fileName of fs.readdirSync(pkg.flowsDir)) {
      fs.copyFileSync(path.join(pkg.flowsDir, fileName), path.join(snapshotFlowsDir, fileName));
    }
  }

  return { snapshotMetaPath, deployZipPath, srcZipPath };
}
