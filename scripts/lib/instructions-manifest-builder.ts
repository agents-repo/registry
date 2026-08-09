import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatterData } from './frontmatter';
import { readJsonFile } from './io/json';
import { getSchemaCurrentVersion } from './schema-versions';
import {
  AGENT_FILE_EXT,
  AGENT_METADATA_EXT,
  AGENTS_DIR,
  FLOWS_DIR,
  SCHEMA_FAMILY_INSTRUCTIONS_MANIFEST,
} from './constants';
import type { PackageMetadata, PackageRef } from './types';
import { isChatWebEntryIncluded, isChatWebSupported } from './compatibility';
import {
  buildPkgAgentInstructionPath,
  buildPkgFlowInstructionPath,
} from './chat-web-paths';

export interface InstructionsManifestInstruction {
  kind: 'agent' | 'flow';
  id: string;
  path: string;
  agentInstructions?: string[];
}

export interface InstructionsManifest {
  schemaVersion: string;
  package: string;
  version: string;
  instructions: InstructionsManifestInstruction[];
}

export interface BuildInstructionsManifestResult {
  manifest: InstructionsManifest;
  includedCount: number;
}

function listInstructionMdFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(AGENT_FILE_EXT))
    .sort((a, b) => a.localeCompare(b));
}

function readSidecarMetadata(
  entryDir: string,
  stem: string,
): Record<string, unknown> {
  const metaPath = path.join(entryDir, `${stem}${AGENT_METADATA_EXT}`);
  if (!fs.existsSync(metaPath)) {
    return {};
  }
  return readJsonFile<Record<string, unknown>>(metaPath);
}

function readFlowAgentIds(entryDir: string, stem: string): string[] {
  const metadata = readSidecarMetadata(entryDir, stem);
  const fromMeta = metadata['agents'];
  if (Array.isArray(fromMeta) && fromMeta.every((item) => typeof item === 'string')) {
    return fromMeta;
  }

  const mdPath = path.join(entryDir, `${stem}${AGENT_FILE_EXT}`);
  if (!fs.existsSync(mdPath)) {
    return [];
  }
  const content = fs.readFileSync(mdPath, 'utf-8');
  const frontmatter = parseFrontmatterData(content);
  const fromFm = frontmatter['agents'];
  if (Array.isArray(fromFm) && fromFm.every((item) => typeof item === 'string')) {
    return fromFm;
  }
  return [];
}

function collectIncludedEntries(
  packageDir: string,
  metadata: PackageMetadata,
): Array<{ kind: 'agent' | 'flow'; id: string; agentIds?: string[] }> {
  if (!isChatWebSupported(metadata)) {
    return [];
  }

  const included: Array<{ kind: 'agent' | 'flow'; id: string; agentIds?: string[] }> = [];

  for (const mdFile of listInstructionMdFiles(path.join(packageDir, AGENTS_DIR))) {
    const stem = mdFile.slice(0, -AGENT_FILE_EXT.length);
    const sidecar = readSidecarMetadata(path.join(packageDir, AGENTS_DIR), stem);
    if (isChatWebEntryIncluded(metadata, sidecar['chatWeb'])) {
      included.push({ kind: 'agent', id: stem });
    }
  }

  for (const mdFile of listInstructionMdFiles(path.join(packageDir, FLOWS_DIR))) {
    const stem = mdFile.slice(0, -AGENT_FILE_EXT.length);
    const flowsDir = path.join(packageDir, FLOWS_DIR);
    const sidecar = readSidecarMetadata(flowsDir, stem);
    if (isChatWebEntryIncluded(metadata, sidecar['chatWeb'])) {
      const agentIds = readFlowAgentIds(flowsDir, stem);
      included.push({ kind: 'flow', id: stem, agentIds });
    }
  }

  included.sort((a, b) => {
    const kindOrder = a.kind.localeCompare(b.kind);
    if (kindOrder !== 0) {
      return kindOrder;
    }
    return a.id.localeCompare(b.id);
  });

  return included;
}

export function buildInstructionsManifest(
  ref: PackageRef,
  packageDir: string,
  metadata: PackageMetadata,
  version: string,
): BuildInstructionsManifestResult | null {
  const included = collectIncludedEntries(packageDir, metadata);
  if (included.length === 0) {
    return null;
  }

  const instructions: InstructionsManifestInstruction[] = included.map((entry) => {
    const base =
      entry.kind === 'agent'
        ? buildPkgAgentInstructionPath(ref.namespace, ref.packageId, version, entry.id)
        : buildPkgFlowInstructionPath(ref.namespace, ref.packageId, version, entry.id);

    if (entry.kind === 'flow' && entry.agentIds !== undefined && entry.agentIds.length > 0) {
      return {
        kind: entry.kind,
        id: entry.id,
        path: base,
        agentInstructions: entry.agentIds.map((agentId) =>
          buildPkgAgentInstructionPath(ref.namespace, ref.packageId, version, agentId),
        ),
      };
    }

    return { kind: entry.kind, id: entry.id, path: base };
  });

  return {
    includedCount: included.length,
    manifest: {
      schemaVersion: getSchemaCurrentVersion(SCHEMA_FAMILY_INSTRUCTIONS_MANIFEST),
      package: ref.qualifiedId,
      version,
      instructions,
    },
  };
}
