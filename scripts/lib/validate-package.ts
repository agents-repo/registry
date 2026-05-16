import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';
import { ValidationUtils } from './validation-utils';
import type { ValidationIssue, ValidationReport } from './types';
import { validateEntryFiles } from './validators/package/entries';
import { err, splitIssues } from './validators/common/issues';
import { readJsonFile } from './validators/package/json-reader';
import { validateManifest } from './validators/package/manifest';
import { validateMetadata } from './validators/package/metadata';

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
  const packageDir = path.join(packagesDir, packageId);

  // 1. Package directory exists
  if (!fs.existsSync(packageDir)) {
    return {
      packageId,
      errors: [
        {
          code: 'ERR_PACKAGE_NOT_FOUND',
          severity: 'error',
          message: `Package directory not found: ${packageDir}`,
        },
      ],
      warnings: [],
      passed: false,
    };
  }

  // 2. metadata.json
  const metadataPath = path.join(packageDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    issues.push(err('ERR_METADATA_INVALID', 'metadata.json is missing from package root'));
  } else {
    const { data, error } = readJsonFile(metadataPath);
    if (error) {
      issues.push(err('ERR_METADATA_INVALID', error));
    } else {
      validateMetadata(data, packageId, issues);

      // Check metadata.version >= manifest latest (if manifest exists)
      const manifestPath = path.join(packageDir, 'versions', 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const { data: mfData } = readJsonFile(manifestPath);
        if (
          mfData &&
          typeof (mfData as Record<string, unknown>)['latest'] === 'string'
        ) {
          const metaVersion = (data as Record<string, unknown>)['version'] as string;
          const manifestLatest = (mfData as Record<string, unknown>)['latest'] as string;
          if (
            ValidationUtils.isReleaseVersion(metaVersion as string) &&
            ValidationUtils.isReleaseVersion(manifestLatest as string) &&
            semver.lt(metaVersion, manifestLatest)
          ) {
            issues.push(
              err(
                'ERR_METADATA_INVALID',
                `metadata.json version "${metaVersion}" must be >= manifest latest "${manifestLatest}"`,
              ),
            );
          }
        }
      }
    }
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

  // 6. Shared frontmatter version consistency
  const allVersions = [
    ...agentEntries.map((e) => e.frontmatterVersion),
    ...flowEntries.map((e) => e.frontmatterVersion),
  ].filter(Boolean);

  if (allVersions.length > 1) {
    const unique = new Set(allVersions);
    if (unique.size > 1) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `All .agent.md files must share one identical frontmatter version; found: ${Array.from(unique).join(', ')}`,
        ),
      );
    }
  }

  // 7. Frontmatter version must equal metadata.json version
  const metaVersionForCheck = (() => {
    const metadataPath = path.join(packageDir, 'metadata.json');
    if (!fs.existsSync(metadataPath)) return undefined;
    const { data } = readJsonFile(metadataPath);
    if (!data || typeof data !== 'object') return undefined;
    return (data as Record<string, unknown>)['version'] as string | undefined;
  })();

  if (metaVersionForCheck && ValidationUtils.isReleaseVersion(metaVersionForCheck as string)) {
    const uniqueVersions = new Set(allVersions);
    if (uniqueVersions.size === 1) {
      const sharedFrontmatterVersion = Array.from(uniqueVersions)[0];
      if (sharedFrontmatterVersion !== metaVersionForCheck) {
        issues.push(
          err(
            'ERR_VALIDATION_FAILED',
            `Frontmatter version "${sharedFrontmatterVersion}" in .agent.md files does not match metadata.json version "${metaVersionForCheck}"`,
          ),
        );
      }
    }
  }

  // 8. Manifest validation (if present)
  const manifestPath = path.join(packageDir, 'versions', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
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
