import fs from 'node:fs';
import { readJsonFile, writeJsonFile } from './io/json';
import { getSchemaCurrentVersion } from './schema-versions';
import type { PackageIndex, PackageIndexEntry, PackageMetadata } from './types';

export class IndexManager {
  private readonly indexPath: string;

  constructor(indexPath: string) {
    this.indexPath = indexPath;
  }

  update(packageId: string, metadata: PackageMetadata, manifestLatest: string): void {
    let index: PackageIndex;
    if (fs.existsSync(this.indexPath)) {
      index = readJsonFile<PackageIndex>(this.indexPath);
    } else {
      index = { schemaVersion: getSchemaCurrentVersion('index'), updatedAt: '', packages: [] };
    }

    const entry: PackageIndexEntry = {
      id: packageId,
      name: metadata.name,
      description: metadata.description,
      latest: manifestLatest,
      tags: metadata.tags,
    };

    const existing = index.packages.findIndex((p) => p.id === packageId);
    if (existing >= 0) {
      index.packages[existing] = entry;
    } else {
      index.packages.push(entry);
      index.packages.sort((a, b) => a.id.localeCompare(b.id));
    }

    index.updatedAt = new Date().toISOString();
    writeJsonFile(this.indexPath, index);
  }
}
