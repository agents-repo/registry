import path from 'node:path';
import { fileURLToPath } from 'node:url';
import semanticRelease, { type Options } from 'semantic-release';
import {
  buildCatalogReleaseOptions,
  loadCatalogReleaseConfig,
} from './lib/load-catalog-release-config.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogConfig = loadCatalogReleaseConfig(repoRoot);
const dryRun = process.argv.includes('--dry-run');

await semanticRelease(buildCatalogReleaseOptions(catalogConfig, { dryRun }) as Options);
