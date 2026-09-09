import { readFileSync } from 'node:fs';
import path from 'node:path';

export type CatalogReleasePlugin = string | readonly [string, ...unknown[]];

export interface CatalogReleaseConfig {
  branches: string[];
  tagFormat: string;
  plugins: CatalogReleasePlugin[];
}

export interface CatalogReleaseOptions extends CatalogReleaseConfig {
  dryRun?: boolean;
}

/**
 * Load catalog semantic-release options from `.releaserc.catalog.json`.
 */
export function loadCatalogReleaseConfig(repoRoot: string): CatalogReleaseConfig {
  const configPath = path.join(repoRoot, '.releaserc.catalog.json');
  return JSON.parse(readFileSync(configPath, 'utf8')) as CatalogReleaseConfig;
}

/**
 * Merge catalog config with CLI options for semantic-release.
 */
export function buildCatalogReleaseOptions(
  catalogConfig: CatalogReleaseConfig,
  cliOptions: Pick<CatalogReleaseOptions, 'dryRun'> = {},
): CatalogReleaseOptions {
  return { ...catalogConfig, ...cliOptions };
}
