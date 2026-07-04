#!/usr/bin/env tsx
/**
 * package-create-smoke — Creates a dummy package in a temp workspace and
 * exercises validate -> build -> artifact validation without AI.
 *
 * Usage:
 *   npm run package:create:smoke -- --package <namespace>/<package-id>
 */

import { parseRequiredPackageId } from './lib/cli';
import { runPackageCreateSmoke } from './lib/create/smoke';

async function main(): Promise<void> {
  const qualifiedRef = parseRequiredPackageId(process.argv);

  console.log(`Running package create smoke flow for: ${qualifiedRef}`);

  try {
    const result = await runPackageCreateSmoke(qualifiedRef, { log: console.log, cleanup: true });

    console.log(`\nSmoke flow complete for ${qualifiedRef}@${result.version}`);
    console.log(`Temporary workspace: ${result.workspaceDir} (removed after run)`);
  } catch (error) {
    console.error('Smoke flow failed:', error);
    process.exit(1);
  }
}

await main();
