import fs from 'node:fs';
import path from 'node:path';

/**
 * Returns the manifest.json path for a given packageDir.
 */
export function getManifestPath(packageDir: string): string {
  return path.join(packageDir, 'versions', 'manifest.json');
}

/**
 * Returns true if manifest.json exists for the given packageDir.
 */
export function hasManifest(packageDir: string): boolean {
  return fs.existsSync(getManifestPath(packageDir));
}