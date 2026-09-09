import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildCatalogReleaseOptions,
  loadCatalogReleaseConfig,
} from '../../../scripts/lib/load-catalog-release-config';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const catalogConfigPath = path.join(repoRoot, '.releaserc.catalog.json');

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
});
