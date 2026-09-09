import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildCatalogReleaseOptions,
  loadCatalogReleaseConfig,
} from '../../../scripts/lib/load-catalog-release-config';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const catalogConfigPath = path.join(repoRoot, '.releaserc.catalog.json');
const tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('catalog release config', () => {
  it('loads .releaserc.catalog.json from the repository root', () => {
    const config = loadCatalogReleaseConfig(repoRoot);

    expect(config).toEqual(JSON.parse(readFileSync(catalogConfigPath, 'utf8')));
  });

  it('configures the catalog batch plugin instead of commit-analyzer', () => {
    const config = loadCatalogReleaseConfig(repoRoot);
    const pluginNames = config.plugins.map((plugin) =>
      Array.isArray(plugin) ? plugin.at(0) : plugin,
    );

    expect(pluginNames).toContain('./scripts/semantic-release/catalog-batch-plugin.mjs');
    expect(pluginNames).not.toContain('@semantic-release/commit-analyzer');
  });

  it('merges CLI overrides such as dryRun', () => {
    const config = loadCatalogReleaseConfig(repoRoot);
    const options = buildCatalogReleaseOptions(config, { dryRun: true });

    expect(options.dryRun).toBe(true);
    expect(options.plugins).toEqual(config.plugins);
  });

  it('throws a contextual error when the catalog config file is missing', () => {
    const missingConfigRoot = mkdtempSync(path.join(os.tmpdir(), 'catalog-release-config-'));
    tempDirs.push(missingConfigRoot);

    expect(() => loadCatalogReleaseConfig(missingConfigRoot)).toThrow(
      `Failed to read catalog release config at ${path.join(missingConfigRoot, '.releaserc.catalog.json')}`,
    );
  });

  it('throws a contextual error when the catalog config file contains invalid JSON', () => {
    const invalidConfigRoot = mkdtempSync(path.join(os.tmpdir(), 'catalog-release-config-'));
    tempDirs.push(invalidConfigRoot);
    const configPath = path.join(invalidConfigRoot, '.releaserc.catalog.json');
    writeFileSync(configPath, '{ invalid json');

    expect(() => loadCatalogReleaseConfig(invalidConfigRoot)).toThrow(
      `Failed to parse catalog release config at ${configPath}`,
    );
  });
});
