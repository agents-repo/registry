import fs from 'node:fs';
import type { PackageIndex, PackageIndexEntry, PackageMetadata } from './types';

export class IndexManager {
  private readonly indexPath: string;

  constructor(indexPath: string) {
    this.indexPath = indexPath;
  }

  update(packageId: string, metadata: PackageMetadata, manifestLatest: string): void {
    let index: PackageIndex;
    if (fs.existsSync(this.indexPath)) {
      index = JSON.parse(fs.readFileSync(this.indexPath, 'utf-8')) as PackageIndex;
    } else {
      index = { schemaVersion: '1.0.0', updatedAt: '', packages: [] };
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
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 4) + '\n', 'utf-8');
  }
}
