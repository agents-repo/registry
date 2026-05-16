import { readJsonFile } from './io/json';
import path from 'node:path';
import type { PackageMetadata } from './types';

export class Package {
  readonly packageId: string;
  readonly packagesDir: string;
  readonly packageDir: string;
  readonly agentsDir: string;
  readonly flowsDir: string;
  readonly versionsDir: string;
  readonly manifestPath: string;
  readonly metadataPath: string;

  constructor(packageId: string, packagesDir: string) {
    this.packageId = packageId;
    this.packagesDir = packagesDir;
    this.packageDir = path.join(packagesDir, packageId);
    this.agentsDir = path.join(this.packageDir, 'agents');
    this.flowsDir = path.join(this.packageDir, 'flows');
    this.versionsDir = path.join(this.packageDir, 'versions');
    this.manifestPath = path.join(this.versionsDir, 'manifest.json');
    this.metadataPath = path.join(this.packageDir, 'metadata.json');
  }

  loadMetadata(): PackageMetadata {
    return readJsonFile<PackageMetadata>(this.metadataPath);
  }

  versionDir(version: string): string {
    return path.join(this.versionsDir, version);
  }
}
