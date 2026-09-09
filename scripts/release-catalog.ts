#!/usr/bin/env tsx
/**
 * release-catalog — Run catalog semantic-release using `.releaserc.catalog.json`.
 *
 * Usage:
 *   npm run release:catalog
 *   npm run release:catalog:dry-run
 */

import { runCatalogRelease } from './lib/release-catalog';

await runCatalogRelease(import.meta.url, process.argv.slice(2));
