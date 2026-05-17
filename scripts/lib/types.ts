export type StatusValue = 'active' | 'deprecated' | 'archived' | 'yanked';
export type CostBand = 'low' | 'medium' | 'high';
export type PackageCostBand = CostBand | 'mixed';

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
