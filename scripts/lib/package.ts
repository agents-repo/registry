import { readJsonFile } from './io/json';
import path from 'node:path';
import type { PackageMetadata, PackageRef } from './types';
import { AGENTS_DIR, FLOWS_DIR, MANIFEST_FILENAME, METADATA_FILENAME, VERSIONS_DIR } from './constants';
import { parseQualifiedPackageRef } from './namespace';

export class Package {
  readonly ref: PackageRef;
  readonly packageId: string;
  readonly namespace: string;
  readonly qualifiedId: string;
  readonly packagesDir: string;
  readonly packageDir: string;
  readonly agentsDir: string;
  readonly flowsDir: string;
  readonly versionsDir: string;
  readonly manifestPath: string;
  readonly metadataPath: string;

  constructor(ref: PackageRef | string, packagesDir: string) {
    this.ref = typeof ref === 'string' ? parseQualifiedPackageRef(ref) : ref;
    this.namespace = this.ref.namespace;
    this.packageId = this.ref.packageId;
    this.qualifiedId = this.ref.qualifiedId;
    this.packagesDir = packagesDir;
    this.packageDir = path.join(packagesDir, this.namespace, this.packageId);
    this.agentsDir = path.join(this.packageDir, AGENTS_DIR);
    this.flowsDir = path.join(this.packageDir, FLOWS_DIR);
    this.versionsDir = path.join(this.packageDir, VERSIONS_DIR);
    this.manifestPath = path.join(this.versionsDir, MANIFEST_FILENAME);
    this.metadataPath = path.join(this.packageDir, METADATA_FILENAME);
  }

  loadMetadata(): PackageMetadata {
    return readJsonFile<PackageMetadata>(this.metadataPath);
  }

  versionDir(version: string): string {
    return path.join(this.versionsDir, version);
  }
}
