import {
  STATUS_VALUES,
  COST_BANDS,
  PACKAGE_COST_BANDS,
  INSTALL_TARGET_IDS,
  INSTALL_TARGET_STATUSES,
  INDEX_INSTALL_TARGET_STATUSES,
  CONSUMPTION_CHANNEL_IDS,
  CONSUMPTION_CHANNEL_STATUSES,
  CHAT_WEB_ENTRY_VALUES,
} from './constants';
export {
  STATUS_VALUES,
  COST_BANDS,
  PACKAGE_COST_BANDS,
  INSTALL_TARGET_IDS,
  INSTALL_TARGET_STATUSES,
  INDEX_INSTALL_TARGET_STATUSES,
  CONSUMPTION_CHANNEL_IDS,
  CONSUMPTION_CHANNEL_STATUSES,
  CHAT_WEB_ENTRY_VALUES,
};

// Derive types from constants to eliminate duplication
export type StatusValue = typeof STATUS_VALUES[number];
export type CostBand = typeof COST_BANDS[number];
export type PackageCostBand = typeof PACKAGE_COST_BANDS[number];

// Type guards
export function isStatus(value: unknown): value is StatusValue {
  return typeof value === 'string' && STATUS_VALUES.includes(value as StatusValue);
}

export function isCostBand(value: unknown): value is CostBand {
  return typeof value === 'string' && COST_BANDS.includes(value as CostBand);
}

export function isPackageCostBand(value: unknown): value is PackageCostBand {
  return typeof value === 'string' && PACKAGE_COST_BANDS.includes(value as PackageCostBand);
}

export type InstallTargetId = typeof INSTALL_TARGET_IDS[number];
export type InstallTargetStatus = typeof INSTALL_TARGET_STATUSES[number];
export type IndexInstallTargetStatus = typeof INDEX_INSTALL_TARGET_STATUSES[number];

export function isInstallTargetId(value: unknown): value is InstallTargetId {
  return typeof value === 'string' && INSTALL_TARGET_IDS.includes(value as InstallTargetId);
}

export function isInstallTargetStatus(value: unknown): value is InstallTargetStatus {
  return typeof value === 'string' && INSTALL_TARGET_STATUSES.includes(value as InstallTargetStatus);
}

export function isIndexInstallTargetStatus(value: unknown): value is IndexInstallTargetStatus {
  return typeof value === 'string' && INDEX_INSTALL_TARGET_STATUSES.includes(value as IndexInstallTargetStatus);
}

export type ConsumptionChannelId = typeof CONSUMPTION_CHANNEL_IDS[number];
export type ConsumptionChannelStatus = typeof CONSUMPTION_CHANNEL_STATUSES[number];
export type ChatWebEntryValue = typeof CHAT_WEB_ENTRY_VALUES[number];

export function isConsumptionChannelId(value: unknown): value is ConsumptionChannelId {
  return typeof value === 'string' && CONSUMPTION_CHANNEL_IDS.includes(value as ConsumptionChannelId);
}

export function isConsumptionChannelStatus(value: unknown): value is ConsumptionChannelStatus {
  return (
    typeof value === 'string' &&
    CONSUMPTION_CHANNEL_STATUSES.includes(value as ConsumptionChannelStatus)
  );
}

export function isChatWebEntryValue(value: unknown): value is ChatWebEntryValue {
  return typeof value === 'string' && CHAT_WEB_ENTRY_VALUES.includes(value as ChatWebEntryValue);
}

export interface ConsumptionChannel {
  id: ConsumptionChannelId;
  status: ConsumptionChannelStatus;
}

export interface CompatibilityTarget {
  id: InstallTargetId;
  status: InstallTargetStatus;
}

export interface PackageCompatibility {
  canonicalFormat?: string;
  targets: CompatibilityTarget[];
  consumption?: ConsumptionChannel[];
}

export interface InstallTargetIndexEntry {
  id: InstallTargetId;
  status: IndexInstallTargetStatus;
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
  maintainers?: string[];
  license: string;
  homepage: string;
  repository: string;
  tags: string[];
  compatibility?: PackageCompatibility;
  documentation?: string;
  keywords?: string[];
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

export interface ManifestArtifactEntry {
  target: InstallTargetId;
  file: string;
  sha256: string;
}

export interface ManifestVersionEntry {
  version: string;
  srcArtifact: string;
  srcSha256: string;
  artifacts: ManifestArtifactEntry[];
  createdAt: string;
  instructionsArtifact?: string;
  instructionsSha256?: string;
}

export interface Manifest {
  schemaVersion: string;
  name: string;
  latest: string;
  versions: ManifestVersionEntry[];
}

export interface PackageIndexEntry {
  id: string;
  namespace: string;
  package: string;
  path: string;
  name: string;
  description: string;
  owner: string;
  latest: string;
  tags: string[];
  status: StatusValue;
  category: string;
  estimateOverallCost: EstimateOverallCost;
  quickstart?: string;
  installTargets?: InstallTargetIndexEntry[];
  chatWeb?: true;
}

export interface PackageIndex {
  schemaVersion: string;
  updatedAt: string;
  aliases?: Record<string, string>;
  packages: PackageIndexEntry[];
}

export interface PackageRef {
  namespace: string;
  packageId: string;
  qualifiedId: string;
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
