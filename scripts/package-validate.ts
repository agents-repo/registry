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

import { parseRequiredPackageId } from './lib/cli/args';
import { resolveScriptPaths } from './lib/cli/paths';
import { exitWithValidationResult } from './lib/cli/reporting';
import { PackageValidator } from './lib/validate-package';

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): void {
  const packageId = parseRequiredPackageId(process.argv);
  const { packagesDir } = resolveScriptPaths(import.meta.url);

  console.log(`Validating package: ${packageId}`);

  const report = new PackageValidator(packageId, packagesDir).validate();

  exitWithValidationResult(report, {
    successMessage: `Validation passed for package: ${packageId}`,
    failurePrefix: `Validation failed for package: ${packageId}`,
  });
}

main();
