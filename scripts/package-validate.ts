#!/usr/bin/env tsx
/**
 * package-validate — Preflight validation for a registry package.
 *
 * Usage:
 *   npm run package:validate -- --package <namespace>/<package-id>
 *
 * Validates the working-state package root under packages/<namespace>/<package-id>/ against the
 * normative rules in specs/package-format.md, specs/metadata-schema.md,
 * specs/manifest-schema.md, and specs/versioning-rules.md.
 *
 * Exits 0 on success, non-zero on any validation error.
 */

import { parseRequiredPackageId, resolveScriptPaths } from './lib/cli';
import { exitWithValidationResult } from './lib/cli/reporting';
import { validatePackagePrTitleFromCiEnv } from './lib/validate-package-pr-title';
import { PackageValidator } from './lib/validate-package';

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): void {
  const packageId = parseRequiredPackageId(process.argv);
  validatePackagePrTitleFromCiEnv();

  const { packagesDir } = resolveScriptPaths(import.meta.url);

  console.log(`Validating package: ${packageId}`);

  const report = new PackageValidator(packageId, packagesDir).validate();

  exitWithValidationResult(report, {
    successMessage: `Validation passed for package: ${packageId}`,
    failurePrefix: `Validation failed for package: ${packageId}`,
  });
}

main();
