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

  let rawConfig: string;
  try {
    rawConfig = readFileSync(configPath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read catalog release config at ${configPath}`, { cause: error });
  }

  try {
    return JSON.parse(rawConfig) as CatalogReleaseConfig;
  } catch (error) {
    throw new Error(`Failed to parse catalog release config at ${configPath}`, { cause: error });
  }
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
