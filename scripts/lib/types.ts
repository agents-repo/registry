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
