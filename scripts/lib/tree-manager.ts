import path from 'node:path';
import { TREE_FILENAME } from './constants';
import { writeJsonFile } from './io/json';
import type { PackageRef } from './namespace';

export interface PackageTree {
  schemaVersion: string;
  updatedAt: string;
  namespaces: Record<string, { packages: string[] }>;
}

const TREE_SCHEMA_VERSION = '1.0.0';

export function buildPackageTree(refs: PackageRef[]): PackageTree {
  const namespaces: Record<string, { packages: string[] }> = {};

  for (const ref of refs) {
    if (!(ref.namespace in namespaces)) {
      namespaces[ref.namespace] = { packages: [] };
    }
    namespaces[ref.namespace].packages.push(ref.packageId);
  }

  for (const entry of Object.values(namespaces)) {
    entry.packages.sort((a, b) => a.localeCompare(b));
  }

  return {
    schemaVersion: TREE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    namespaces,
  };
}

export function writePackageTree(packagesDir: string, refs: PackageRef[]): void {
  const treePath = path.join(packagesDir, TREE_FILENAME);
  writeJsonFile(treePath, buildPackageTree(refs));
}
