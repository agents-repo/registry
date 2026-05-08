#!/usr/bin/env tsx
/**
 * package-validate — Preflight validation for a registry package.
 *
 * Usage:
 *   npm run package:validate -- --package <id>
 *
 * Validates the working-state package root under packages/<id>/ against the
 * normative rules in specs/package-format.md, specs/metadata-schema.md,
 * specs/manifest-schema.md, and specs/versioning-rules.md.
 *
 * Exits 0 on success, non-zero on any validation error.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PackageValidator } from './lib/validate-package';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { packageId: string } {
  const args = argv.slice(2);
  const idx = args.indexOf('--package');
  if (idx === -1 || !args[idx + 1]) {
    console.error('Error: --package <id> is required');
    process.exit(1);
  }
  return { packageId: args[idx + 1] };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): void {
  const { packageId } = parseArgs(process.argv);

  const repoRoot = path.resolve(scriptDir, '..');
  const packagesDir = path.join(repoRoot, 'packages');

  console.log(`Validating package: ${packageId}`);

  const report = new PackageValidator(packageId, packagesDir).validate();

  for (const w of report.warnings) {
    console.warn(`  [WARN]  ${w.message}`);
  }

  for (const e of report.errors) {
    console.error(`  [ERROR] (${e.code}) ${e.message}`);
  }

  if (report.passed) {
    console.log(`Validation passed for package: ${packageId}`);
    process.exit(0);
  } else {
    console.error(
      `Validation failed for package: ${packageId} — ${report.errors.length} error(s)`,
    );
    process.exit(1);
  }
}

main();
