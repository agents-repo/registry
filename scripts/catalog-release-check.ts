#!/usr/bin/env tsx
/**
 * catalog-release-check — Detect unreleased `packages/` changes since the latest v* tag.
 *
 * Usage:
 *   npm run catalog:release:check
 *
 * Exit codes:
 *   0 — unreleased package changes exist (catalog release should run)
 *   1 — no unreleased package changes
 */

import { runCatalogReleaseCheckCli } from './lib/catalog-release-check';

await runCatalogReleaseCheckCli(process.argv.slice(2));
