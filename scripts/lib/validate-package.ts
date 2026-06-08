import type { PackageMetadata, ValidationIssue, ValidationReport } from './types';
import { splitIssues } from './validators/common/issues';
import {
  validateHasEntries,
  validateUniqueIdsAcrossEntryTypes,
} from './validators/package/entries';
import { loadPackageEntries } from './validators/package/entry-loading';
import { validateCompatibilityManifestAlignment } from './validators/package/compatibility-consistency';
import { validateManifest } from './validators/package/manifest';
import { validateMetadata } from './validators/package/metadata';
import {
  getManifestPath,
  hasManifest,
  loadPackageMetadata,
  resolvePackageDir,
} from './validators/package/preflight';
import {
  validateFrontmatterVersionMatchesMetadata,
  validateMetadataVersionAgainstManifestLatest,
  validateSharedFrontmatterVersion,
} from './validators/package/version-consistency';

// ---------------------------------------------------------------------------
// PackageValidator class
// ---------------------------------------------------------------------------

export class PackageValidator {
  private readonly packageId: string;
  private readonly packagesDir: string;

  constructor(packageId: string, packagesDir: string) {
    this.packageId = packageId;
    this.packagesDir = packagesDir;
  }

  validate(): ValidationReport {
    return validatePackage(this.packageId, this.packagesDir);
  }
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export function validatePackage(
  packageId: string,
  packagesDir: string,
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const { packageDir, report } = resolvePackageDir(packageId, packagesDir);
  if (report) {
    return report;
  }

  // 2. Package metadata
  const metadata = loadPackageMetadata(packageDir, issues);
  let validatedMetadata: PackageMetadata | null = null;
  if (metadata !== null) {
    if (validateMetadata(metadata, packageId, issues)) {
      validatedMetadata = metadata;
    }
    validateMetadataVersionAgainstManifestLatest(packageDir, metadata, issues);
  }

  // 3. Agent and flow entries
  const { agentEntries, flowEntries, allEntries } = loadPackageEntries(packageDir, issues);

  // 4-5. Entry consistency checks
  validateHasEntries(agentEntries, flowEntries, issues);
  validateUniqueIdsAcrossEntryTypes(agentEntries, flowEntries, issues);

  // 6. Frontmatter version consistency checks
  const sharedFrontmatterVersion = validateSharedFrontmatterVersion(allEntries, issues);
  validateFrontmatterVersionMatchesMetadata(packageDir, sharedFrontmatterVersion, issues);

  // 8. Manifest validation (if present)
  const manifestPath = getManifestPath(packageDir);
  if (hasManifest(packageDir) && validatedMetadata !== null) {
    const manifest = validateManifest(manifestPath, packageId, issues);
    if (manifest !== null) {
      validateCompatibilityManifestAlignment(validatedMetadata, manifest, issues);
    }
  }

  const { errors, warnings } = splitIssues(issues);

  return {
    packageId,
    errors,
    warnings,
    passed: errors.length === 0,
  };
}
