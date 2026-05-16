import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveScriptPaths(importMetaUrl: string): {
  scriptDir: string;
  repoRoot: string;
  packagesDir: string;
} {
  const scriptDir = fileURLToPath(new URL('.', importMetaUrl));
  const repoRoot = path.resolve(scriptDir, '..');
  const packagesDir = path.join(repoRoot, 'packages');
  return { scriptDir, repoRoot, packagesDir };
}
