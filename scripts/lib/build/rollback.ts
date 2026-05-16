import fs from 'node:fs';
import { readJsonFile } from '../io/json';

export function rollbackVersionDirectory(versionDir: string): void {
  if (fs.existsSync(versionDir)) {
    try {
      fs.rmSync(versionDir, { recursive: true, force: true });
      console.error(`  [ROLLBACK] Removed partial version directory: ${versionDir}`);
    } catch {
      console.error(`  [ROLLBACK] Failed to remove: ${versionDir}`);
    }
  }
}

export function warnIfIndexMayBeInconsistent(indexPath: string, packageId: string): void {
  if (!fs.existsSync(indexPath)) {
    return;
  }

  try {
    const currentIndex = readJsonFile<Record<string, unknown>>(indexPath);
    if ((currentIndex as Record<string, unknown>)[packageId] !== undefined) {
      console.error(
        `  [CRITICAL] packages/index.json may be inconsistent. ` +
          `Review the index for package "${packageId}" and ensure it matches versions/manifest.json.`,
      );
    }
  } catch {
    // Index JSON is malformed; leave for user to diagnose.
  }
}
