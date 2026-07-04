import fs from 'node:fs';
import { ErrorCode, PackageError } from './errors';
import { readJsonFile, writeJsonFile } from './io/json';
import { getSchemaCurrentVersion } from './schema-versions';
import { ValidationUtils } from './validation-utils';
import {
  ESTIMATED_COST_MIN,
  ESTIMATED_COST_MAX,
  GITHUB_USER_OR_TEAM_SLUG_PATTERN,
  SCHEMA_FAMILY_INDEX,
} from './constants';
import { projectInstallTargetsForIndex } from './compatibility';
import {
  buildAliasesFromPackages,
  buildPackagePath,
  listDiscoveredPackages,
  validateNamespaceEqualsOwner,
  type DiscoveredPackage,
  type PackageRef,
} from './namespace';
import { writePackageTree } from './tree-manager';
import type { ManifestArtifactEntry, PackageIndex, PackageIndexEntry, PackageMetadata } from './types';
import { isStatus, isPackageCostBand, STATUS_VALUES, PACKAGE_COST_BANDS } from './types';
import path from 'node:path';

function requirePackageBand(value: unknown, packageId: string): 'minimal' | 'low' | 'moderate' | 'high' | 'critical' | 'mixed' {
  if (isPackageCostBand(value)) {
    return value;
  }
  throw new PackageError(
    ErrorCode.ERR_METADATA_INVALID,
    `metadata.json estimateOverallCost.band for package "${packageId}" must be one of "${PACKAGE_COST_BANDS.join('", "')}"`,
  );
}

function requireStatus(value: unknown, packageId: string): 'active' | 'deprecated' | 'archived' | 'yanked' {
  if (isStatus(value)) {
    return value;
  }
  throw new PackageError(
    ErrorCode.ERR_METADATA_INVALID,
    `metadata.json status for package "${packageId}" must be one of "${STATUS_VALUES.join('", "')}"`,
  );
}

function requireCategory(value: unknown, packageId: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  throw new PackageError(
    ErrorCode.ERR_METADATA_INVALID,
    `metadata.json category for package "${packageId}" must be a non-empty string`,
  );
}

function requireNonEmptyString(value: unknown, field: string, packageId: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  throw new PackageError(
    ErrorCode.ERR_METADATA_INVALID,
    `metadata.json ${field} for package "${packageId}" must be a non-empty string`,
  );
}

function requireOwner(value: unknown, packageId: string): string {
  const owner = requireNonEmptyString(value, 'owner', packageId);
  if (!GITHUB_USER_OR_TEAM_SLUG_PATTERN.test(owner)) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `metadata.json owner for package "${packageId}" must be a GitHub owner or organization slug`,
    );
  }
  return owner;
}

function requireTags(value: unknown, packageId: string): string[] {
  if (!Array.isArray(value) || value.length < 1) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `metadata.json tags for package "${packageId}" must be a non-empty array of strings`,
    );
  }

  const tags: string[] = [];
  for (const tag of value) {
    if (typeof tag !== 'string' || tag.trim().length === 0) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `metadata.json tags for package "${packageId}" must contain only non-empty strings`,
      );
    }
    tags.push(tag);
  }

  return tags;
}

function projectQuickstart(value: unknown, packageId: string): { quickstart: string } | {} {
  if (value === undefined) {
    return {};
  }
  if (typeof value !== 'string' || value.trim().length === 0 || !ValidationUtils.isHttpsUrl(value)) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `metadata.json quickstart for package "${packageId}" must be an HTTPS URL when provided`,
    );
  }
  return { quickstart: value };
}

function projectEstimatedCost(value: unknown, packageId: string): { estimatedCost: number } | {} {
  if (value === undefined) {
    return {};
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < ESTIMATED_COST_MIN || value > ESTIMATED_COST_MAX) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `metadata.json estimateOverallCost.estimatedCost for package "${packageId}" must be an integer between 1 and 10 when provided`,
    );
  }
  return { estimatedCost: value };
}

function assertNoEntriesMissingOwner(index: PackageIndex): void {
  const hasEntryMissingOwner = index.packages.some(
    (entry) => typeof entry.owner !== 'string' || entry.owner.trim().length === 0,
  );

  if (hasEntryMissingOwner) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      'packages/index.json contains entries without required owner; run "npm run package:index:rebuild" before package updates',
    );
  }
}

function refreshAliasesAndTree(
  index: PackageIndex,
  packagesDir: string,
  discovered?: DiscoveredPackage[],
): void {
  const packages = discovered ?? listDiscoveredPackages(packagesDir);
  index.aliases = buildAliasesFromPackages(packages);
  writePackageTree(
    packagesDir,
    packages.map((entry) => entry.ref),
  );
}

export interface IndexUpdateOptions {
  deferDerivedRefresh?: boolean;
}

export class IndexManager {
  private readonly indexPath: string;
  private readonly packagesDir: string;

  constructor(indexPath: string, packagesDir?: string) {
    this.indexPath = indexPath;
    this.packagesDir = packagesDir ?? path.dirname(indexPath);
  }

  update(
    ref: PackageRef,
    metadata: PackageMetadata,
    manifestLatest: string,
    artifacts: ManifestArtifactEntry[],
    options: IndexUpdateOptions = {},
  ): void {
    const { namespace, packageId, qualifiedId } = ref;
    const estimateOverallCost: unknown = metadata.estimateOverallCost;
    if (
      typeof estimateOverallCost !== 'object' ||
      estimateOverallCost === null ||
      Array.isArray(estimateOverallCost)
    ) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `metadata.json estimateOverallCost for package "${qualifiedId}" must be an object`,
      );
    }

    const owner = requireOwner(metadata.owner, qualifiedId);
    validateNamespaceEqualsOwner(namespace, owner, qualifiedId);

    let index: PackageIndex;
    if (fs.existsSync(this.indexPath)) {
      index = readJsonFile<PackageIndex>(this.indexPath);
    } else {
      index = { schemaVersion: getSchemaCurrentVersion(SCHEMA_FAMILY_INDEX), updatedAt: '', packages: [] };
    }

    assertNoEntriesMissingOwner(index);

    index.schemaVersion = getSchemaCurrentVersion(SCHEMA_FAMILY_INDEX);

    const entry: PackageIndexEntry = {
      id: qualifiedId,
      namespace,
      package: packageId,
      path: buildPackagePath(namespace, packageId),
      name: requireNonEmptyString(metadata.name, 'name', qualifiedId),
      description: requireNonEmptyString(metadata.description, 'description', qualifiedId),
      owner,
      latest: manifestLatest,
      tags: requireTags(metadata.tags, qualifiedId),
      status: requireStatus(metadata.status, qualifiedId),
      category: requireCategory(metadata.category, qualifiedId),
      estimateOverallCost: {
        ...projectEstimatedCost(metadata.estimateOverallCost?.estimatedCost, qualifiedId),
        band: requirePackageBand(metadata.estimateOverallCost?.band, qualifiedId),
      },
      ...projectQuickstart(metadata.quickstart, qualifiedId),
      installTargets: projectInstallTargetsForIndex(metadata, artifacts),
    };

    const existing = index.packages.findIndex((p) => p.id === qualifiedId);
    if (existing >= 0) {
      index.packages[existing] = entry;
    } else {
      index.packages.push(entry);
      index.packages.sort((a, b) => a.id.localeCompare(b.id));
    }

    index.updatedAt = new Date().toISOString();
    if (options.deferDerivedRefresh !== true) {
      refreshAliasesAndTree(index, this.packagesDir);
    }
    writeJsonFile(this.indexPath, index);
  }

  refreshDerivedState(discovered?: DiscoveredPackage[]): void {
    const index = readJsonFile<PackageIndex>(this.indexPath);
    refreshAliasesAndTree(index, this.packagesDir, discovered);
    writeJsonFile(this.indexPath, index);
  }
}
