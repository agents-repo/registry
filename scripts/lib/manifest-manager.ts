import fs from 'node:fs';
import semver from 'semver';
import { getSchemaCurrentVersion } from './schema-versions';
import type { Manifest, ManifestVersionEntry } from './types';

export class ManifestManager {
  private readonly manifestPath: string;
  private readonly packageId: string;

  constructor(manifestPath: string, packageId: string) {
    this.manifestPath = manifestPath;
    this.packageId = packageId;
  }

  load(): Manifest {
    if (fs.existsSync(this.manifestPath)) {
      return JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8')) as Manifest;
    }
    return {
      schemaVersion: getSchemaCurrentVersion('manifest'),
      name: this.packageId,
      latest: '',
      versions: [],
    };
  }

  upsert(manifest: Manifest, entry: ManifestVersionEntry): Manifest {
    const updated = { ...manifest, versions: [...manifest.versions] };
    const existing = updated.versions.findIndex((v) => v.version === entry.version);
    if (existing >= 0) {
      updated.versions[existing] = entry;
    } else {
      updated.versions.push(entry);
    }
    updated.versions.sort((a, b) => semver.compare(a.version, b.version));
    const maxVer = semver.maxSatisfying(
      updated.versions.map((v) => v.version),
      '*',
    );
    updated.latest = maxVer ?? entry.version;
    return updated;
  }

  save(manifest: Manifest): void {
    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 4) + '\n', 'utf-8');
  }
}
