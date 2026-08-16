import fs from 'node:fs';
import path from 'node:path';
import { projectChatWebForIndex } from './compatibility';
import {
  AGENT_FILE_EXT,
  AGENT_METADATA_EXT,
  AGENTS_DIR,
  DETAIL_FILENAME,
  FLOWS_DIR,
  METADATA_FILENAME,
  README_FILENAME,
  SCHEMA_FAMILY_PACKAGE_DETAIL,
  VERSIONS_DIR,
} from './constants';
import { ErrorCode, PackageError } from './errors';
import { readJsonFile, readTextFileIfExists, writeJsonFile } from './io/json';
import { getSchemaCurrentVersion } from './schema-versions';
import type { EstimateCost, Manifest, PackageMetadata, PackageRef, StatusValue } from './types';
import { isCostBand, isStatus } from './types';

export interface PackageDetailEntry {
  id: string;
  name: string;
  description: string;
  status: StatusValue;
  category: string;
  estimateCost: EstimateCost;
  instructionPath: string;
  agents?: string[];
}

export interface PackageDetailVersionEntry {
  version: string;
  createdAt: string;
  srcArtifact: string;
  artifacts: Array<{ target: string; file: string }>;
  instructionsArtifact?: string;
}

export interface PackageDetailDocument {
  schemaVersion: string;
  package: string;
  version: string;
  metadata: PackageMetadata;
  readmeMarkdown?: string;
  agents: PackageDetailEntry[];
  flows: PackageDetailEntry[];
  versions: {
    latest: string;
    entries: PackageDetailVersionEntry[];
  };
  chatWeb?: true;
  instructionsPath?: string;
}

function requireString(value: unknown, field: string, context: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `${context} ${field} must be a non-empty string`,
    );
  }
  return value;
}

function requireEstimateCost(value: unknown, context: string): EstimateCost {
  if (typeof value !== 'object' || value === null) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `${context} estimateCost must be an object`,
    );
  }

  const estimateCost = value as Record<string, unknown>;
  const estimatedCost = estimateCost['estimatedCost'];
  const band = estimateCost['band'];
  if (
    typeof estimatedCost !== 'number' ||
    !Number.isInteger(estimatedCost) ||
    !isCostBand(band)
  ) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `${context} estimateCost must include integer estimatedCost and a valid band`,
    );
  }

  return { estimatedCost, band };
}

function listSidecarFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(AGENT_METADATA_EXT))
    .sort((left, right) => left.localeCompare(right));
}

function buildInstructionPath(
  kind: 'agent' | 'flow',
  ref: PackageRef,
  version: string,
  id: string,
): string {
  const folder = kind === 'agent' ? AGENTS_DIR : FLOWS_DIR;
  return `packages/${ref.namespace}/${ref.packageId}/${VERSIONS_DIR}/${version}/${folder}/${id}${AGENT_FILE_EXT}`;
}

function readEntrySummaries(
  kind: 'agent' | 'flow',
  snapshotKindDir: string,
  ref: PackageRef,
  version: string,
): PackageDetailEntry[] {
  const entries: PackageDetailEntry[] = [];

  for (const fileName of listSidecarFiles(snapshotKindDir)) {
    const id = fileName.slice(0, -AGENT_METADATA_EXT.length);
    const sidecar = readJsonFile<Record<string, unknown>>(path.join(snapshotKindDir, fileName));
    const context = `${kind}s/${fileName}`;
    const statusValue = sidecar['status'];
    if (!isStatus(statusValue)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `${context} status must be a valid status value`,
      );
    }

    const entry: PackageDetailEntry = {
      id,
      name: requireString(sidecar['name'], 'name', context),
      description: requireString(sidecar['description'], 'description', context),
      status: statusValue,
      category: requireString(sidecar['category'], 'category', context),
      estimateCost: requireEstimateCost(sidecar['estimateCost'], context),
      instructionPath: buildInstructionPath(kind, ref, version, id),
    };

    if (kind === 'flow') {
      const agents = sidecar['agents'];
      if (Array.isArray(agents) && agents.every((item) => typeof item === 'string')) {
        entry.agents = agents;
      }
    }

    entries.push(entry);
  }

  return entries;
}

export function buildPackageDetailDocument(
  ref: PackageRef,
  packageDir: string,
  latest: string,
  manifest: Manifest,
): PackageDetailDocument {
  const snapshotDir = path.join(packageDir, VERSIONS_DIR, latest);
  const snapshotMetaPath = path.join(snapshotDir, METADATA_FILENAME);
  if (!fs.existsSync(snapshotMetaPath)) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `Cannot build ${DETAIL_FILENAME}: missing ${VERSIONS_DIR}/${latest}/${METADATA_FILENAME} for "${ref.qualifiedId}"`,
    );
  }

  const metadata = readJsonFile<PackageMetadata>(snapshotMetaPath);
  const readmeMarkdown = readTextFileIfExists(path.join(snapshotDir, README_FILENAME)) ?? undefined;
  const agents = readEntrySummaries('agent', path.join(snapshotDir, AGENTS_DIR), ref, latest);
  const flows = readEntrySummaries('flow', path.join(snapshotDir, FLOWS_DIR), ref, latest);

  const document: PackageDetailDocument = {
    schemaVersion: getSchemaCurrentVersion(SCHEMA_FAMILY_PACKAGE_DETAIL),
    package: ref.qualifiedId,
    version: latest,
    metadata,
    agents,
    flows,
    versions: {
      latest: manifest.latest,
      entries: manifest.versions.map((entry) => ({
        version: entry.version,
        createdAt: entry.createdAt,
        srcArtifact: entry.srcArtifact,
        artifacts: entry.artifacts.map((artifact) => ({
          target: artifact.target,
          file: artifact.file,
        })),
        ...(entry.instructionsArtifact === undefined
          ? {}
          : { instructionsArtifact: entry.instructionsArtifact }),
      })),
    },
  };

  if (readmeMarkdown !== undefined) {
    document.readmeMarkdown = readmeMarkdown;
  }

  const latestEntry = manifest.versions.find((entry) => entry.version === latest);
  if (latestEntry !== undefined && projectChatWebForIndex(metadata, latestEntry)) {
    document.chatWeb = true;
    document.instructionsPath = `/pkg/${ref.namespace}/${ref.packageId}/${latest}/instructions.json`;
  }

  return document;
}

export function writePackageDetailJson(
  ref: PackageRef,
  packageDir: string,
  latest: string,
  manifest: Manifest,
): string {
  const detailPath = path.join(packageDir, DETAIL_FILENAME);
  const document = buildPackageDetailDocument(ref, packageDir, latest, manifest);
  writeJsonFile(detailPath, document);
  return detailPath;
}
