// Validation constants (single source of truth)
export const STATUS_VALUES = ['active', 'deprecated', 'archived', 'yanked'] as const;
export const COST_BANDS = ['minimal', 'low', 'moderate', 'high', 'critical'] as const;
export const PACKAGE_COST_BANDS = ['minimal', 'low', 'moderate', 'high', 'critical', 'mixed'] as const;

// Derive types from constants to eliminate duplication
export type StatusValue = typeof STATUS_VALUES[number];
export type CostBand = typeof COST_BANDS[number];
export type PackageCostBand = typeof PACKAGE_COST_BANDS[number];

// Type guards
export function isStatus(value: unknown): value is StatusValue {
  return STATUS_VALUES.includes(value as any);
}

export function isCostBand(value: unknown): value is CostBand {
  return COST_BANDS.includes(value as any);
}

export function isPackageCostBand(value: unknown): value is PackageCostBand {
  return PACKAGE_COST_BANDS.includes(value as any);
}

export interface EstimateCost {
  estimatedCost: number;
  band: CostBand;
}

export interface EstimateOverallCost {
  estimatedCost?: number;
  band: PackageCostBand;
}

export interface PackageMetadata {
  schemaVersion: string;
  name: string;
  description: string;
  owner: string;
  license: string;
  homepage: string;
  repository: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  version: string;
  status: StatusValue;
  category: string;
  estimateOverallCost: EstimateOverallCost;
  quickstart?: string;
  customAttributes?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ManifestVersionEntry {
  version: string;
  artifact: string;
  sha256: string;
  srcArtifact: string;
  srcSha256: string;
  createdAt: string;
}

export interface Manifest {
  schemaVersion: string;
  name: string;
  latest: string;
  versions: ManifestVersionEntry[];
}

export interface PackageIndexEntry {
  id: string;
  name: string;
  description: string;
  latest: string;
  tags: string[];
  status: StatusValue;
  category: string;
  estimateOverallCost: EstimateOverallCost;
  quickstart?: string;
}

export interface PackageIndex {
  schemaVersion: string;
  updatedAt: string;
  packages: PackageIndexEntry[];
}

export interface ValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationReport {
  packageId: string;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  passed: boolean;
}
