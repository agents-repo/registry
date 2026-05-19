import fs from 'node:fs';
import { ErrorCode, PackageError } from './errors';
import { readJsonFile, writeJsonFile } from './io/json';
import { getSchemaCurrentVersion } from './schema-versions';
import { ValidationUtils } from './validation-utils';
import type { PackageIndex, PackageIndexEntry, PackageMetadata } from './types';
import { isStatus, isPackageCostBand, STATUS_VALUES, PACKAGE_COST_BANDS } from './types';

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

function requireTags(value: unknown, packageId: string): string[] {
  if (!Array.isArray(value) || value.length < 1) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `metadata.json tags for package "${packageId}" must be a non-empty array of strings`,
    );
  }

  for (const tag of value) {
    if (typeof tag !== 'string' || tag.trim().length === 0) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `metadata.json tags for package "${packageId}" must contain only non-empty strings`,
      );
    }
  }

  return value;
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
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 10) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `metadata.json estimateOverallCost.estimatedCost for package "${packageId}" must be a finite number between 1 and 10 when provided`,
    );
  }
  return { estimatedCost: value };
}

export class IndexManager {
  private readonly indexPath: string;

  constructor(indexPath: string) {
    this.indexPath = indexPath;
  }

  update(packageId: string, metadata: PackageMetadata, manifestLatest: string): void {
    if (typeof metadata.estimateOverallCost !== 'object' || metadata.estimateOverallCost === null) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `metadata.json estimateOverallCost for package "${packageId}" must be an object`,
      );
    }

    let index: PackageIndex;
    if (fs.existsSync(this.indexPath)) {
      index = readJsonFile<PackageIndex>(this.indexPath);
    } else {
      index = { schemaVersion: getSchemaCurrentVersion('index'), updatedAt: '', packages: [] };
    }

    const entry: PackageIndexEntry = {
      id: packageId,
      name: requireNonEmptyString(metadata.name, 'name', packageId),
      description: requireNonEmptyString(metadata.description, 'description', packageId),
      latest: manifestLatest,
      tags: requireTags(metadata.tags, packageId),
      status: requireStatus(metadata.status, packageId),
      category: requireCategory(metadata.category, packageId),
      estimateOverallCost: {
        ...projectEstimatedCost(metadata.estimateOverallCost?.estimatedCost, packageId),
        band: requirePackageBand(metadata.estimateOverallCost?.band, packageId),
      },
      ...projectQuickstart(metadata.quickstart, packageId),
    };

    const existing = index.packages.findIndex((p) => p.id === packageId);
    if (existing >= 0) {
      index.packages[existing] = entry;
    } else {
      index.packages.push(entry);
      index.packages.sort((a, b) => a.id.localeCompare(b.id));
    }

    index.updatedAt = new Date().toISOString();
    writeJsonFile(this.indexPath, index);
  }
}
