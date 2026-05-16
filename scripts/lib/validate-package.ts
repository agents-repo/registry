import type { ValidationIssue, ValidationReport } from './types';
import { splitIssues } from './validators/common/issues';
import {
  validateHasEntries,
  validateUniqueIdsAcrossEntryTypes,
} from './validators/package/entry-consistency';
import { loadPackageEntries } from './validators/package/entry-loading';
import { validateManifest } from './validators/package/manifest';
import { getManifestPath, hasManifest } from './validators/package/manifest-preflight';
import { validateMetadata } from './validators/package/metadata';
import { loadPackageMetadata, resolvePackageDir } from './validators/package/preflight';
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

  // 2. metadata.json
  const metadata = loadPackageMetadata(packageDir, issues);
  if (metadata !== null) {
    validateMetadata(metadata, packageId, issues);
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
  if (hasManifest(packageDir)) {
    validateManifest(manifestPath, packageId, issues);
  }

  const { errors, warnings } = splitIssues(issues);

  return {
    packageId,
    errors,
    warnings,
    passed: errors.length === 0,
  };
}
