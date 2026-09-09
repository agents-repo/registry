import { chdir } from 'node:process';
import semanticRelease, { type Options } from 'semantic-release';
import { resolveScriptPaths } from './cli';
import {
  buildCatalogReleaseOptions,
  loadCatalogReleaseConfig,
} from './load-catalog-release-config';

/**
 * Run catalog semantic-release from the repository root so config and git state align.
 */
export async function runCatalogRelease(
  importMetaUrl: string,
  argv: readonly string[] = process.argv,
): Promise<void> {
  const { repoRoot } = resolveScriptPaths(importMetaUrl);
  chdir(repoRoot);

  const catalogConfig = loadCatalogReleaseConfig(repoRoot);
  const dryRun = argv.includes('--dry-run');

  await semanticRelease(buildCatalogReleaseOptions(catalogConfig, { dryRun }) as Options);
}
