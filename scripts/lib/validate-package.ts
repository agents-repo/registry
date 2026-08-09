import type { PackageMetadata, ValidationIssue, ValidationReport } from './types';
import { parseQualifiedPackageRef, validateNamespaceEqualsOwner } from './namespace';
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
import { validateChatWebIncludedRequiresSupportedChannel } from './validators/package/chat-web-consistency';

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
  qualifiedRef: string,
  packagesDir: string,
): ValidationReport {
  const ref = parseQualifiedPackageRef(qualifiedRef);
  const leafPackageId = ref.packageId;
  const issues: ValidationIssue[] = [];
  const { packageDir, report } = resolvePackageDir(qualifiedRef, packagesDir);
  if (report) {
    return report;
  }

  const validatedMetadata = validatePackageMetadataSection({
    ref,
    packageDir,
    leafPackageId,
    issues,
  });

  validatePackageEntriesSection(packageDir, issues);

  if (validatedMetadata !== null) {
    validateChatWebIncludedRequiresSupportedChannel(packageDir, validatedMetadata, issues);
  }

  validatePackageManifestSection(packageDir, leafPackageId, validatedMetadata, issues);

  const { errors, warnings } = splitIssues(issues);

  return {
    packageId: ref.qualifiedId,
    errors,
    warnings,
    passed: errors.length === 0,
  };
}

function validatePackageMetadataSection(options: {
  readonly ref: ReturnType<typeof parseQualifiedPackageRef>;
  readonly packageDir: string;
  readonly leafPackageId: string;
  readonly issues: ValidationIssue[];
}): PackageMetadata | null {
  const metadata = loadPackageMetadata(options.packageDir, options.issues);
  let validatedMetadata: PackageMetadata | null = null;
  if (metadata === null) {
    return null;
  }

  if (typeof metadata.owner === 'string') {
    try {
      validateNamespaceEqualsOwner(
        options.ref.namespace,
        metadata.owner,
        options.ref.qualifiedId,
      );
    } catch (error) {
      options.issues.push({
        code: 'ERR_METADATA_INVALID',
        severity: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  if (validateMetadata(metadata, options.leafPackageId, options.issues)) {
    validatedMetadata = metadata;
  }
  validateMetadataVersionAgainstManifestLatest(options.packageDir, metadata, options.issues);
  return validatedMetadata;
}

function validatePackageEntriesSection(packageDir: string, issues: ValidationIssue[]): void {
  const { agentEntries, flowEntries, allEntries } = loadPackageEntries(packageDir, issues);
  validateHasEntries(agentEntries, flowEntries, issues);
  validateUniqueIdsAcrossEntryTypes(agentEntries, flowEntries, issues);
  const sharedFrontmatterVersion = validateSharedFrontmatterVersion(allEntries, issues);
  validateFrontmatterVersionMatchesMetadata(packageDir, sharedFrontmatterVersion, issues);
}

function validatePackageManifestSection(
  packageDir: string,
  leafPackageId: string,
  validatedMetadata: PackageMetadata | null,
  issues: ValidationIssue[],
): void {
  const manifestPath = getManifestPath(packageDir);
  if (!hasManifest(packageDir) || validatedMetadata === null) {
    return;
  }

  const manifest = validateManifest(manifestPath, leafPackageId, issues);
  if (manifest !== null) {
    validateCompatibilityManifestAlignment(validatedMetadata, manifest, issues);
  }
}
