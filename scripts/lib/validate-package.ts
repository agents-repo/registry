import fs from 'node:fs';
import path from 'node:path';
import type { ValidationIssue, ValidationReport } from './types';
import { validateEntryFiles } from './validators/package/entries';
import { err, splitIssues } from './validators/common/issues';
import { validateManifest } from './validators/package/manifest';
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
  const agentsDir = path.join(packageDir, 'agents');
  const flowsDir = path.join(packageDir, 'flows');

  const agentEntries = validateEntryFiles(agentsDir, 'agents', issues);
  const flowEntries = validateEntryFiles(flowsDir, 'flows', issues);

  // 4. At least one agent or flow
  if (agentEntries.length === 0 && flowEntries.length === 0) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        'Package must contain at least one agent (agents/) or flow (flows/)',
      ),
    );
  }

  // 5. Unique IDs across agents and flows
  const agentIds = new Set(agentEntries.map((e) => e.id));
  for (const flow of flowEntries) {
    if (agentIds.has(flow.id)) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `ID "${flow.id}" is used in both agents/ and flows/; IDs must be unique across both`,
        ),
      );
    }
  }

  // 6. Frontmatter version consistency checks
  const allEntries = [...agentEntries, ...flowEntries];
  const sharedFrontmatterVersion = validateSharedFrontmatterVersion(allEntries, issues);
  validateFrontmatterVersionMatchesMetadata(packageDir, sharedFrontmatterVersion, issues);

  // 8. Manifest validation (if present)
  const manifestPath = path.join(packageDir, 'versions', 'manifest.json');
  validateManifestIfPresent(manifestPath, packageId, issues);

  const { errors, warnings } = splitIssues(issues);

  return {
    packageId,
    errors,
    warnings,
    passed: errors.length === 0,
  };
}

function validateManifestIfPresent(
  manifestPath: string,
  packageId: string,
  issues: ValidationIssue[],
): void {
  if (fs.existsSync(manifestPath)) {
    validateManifest(manifestPath, packageId, issues);
  }
}
