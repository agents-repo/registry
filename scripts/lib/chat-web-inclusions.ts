import fs from 'node:fs';
import path from 'node:path';
import { isChatWebEntryIncluded, isChatWebSupported } from './compatibility';
import {
  AGENT_FILE_EXT,
  AGENT_METADATA_EXT,
  AGENTS_DIR,
  FLOWS_DIR,
  ID_PATTERN,
} from './constants';
import { ErrorCode, PackageError } from './errors';
import { parseFrontmatterData } from './frontmatter';
import { readJsonFile } from './io/json';
import type { DefaultInstructionRef, PackageMetadata } from './types';

export interface ChatWebIncludedEntry {
  kind: 'agent' | 'flow';
  id: string;
  agentIds?: string[];
}

function assertInstructionId(id: string, context: string): void {
  if (!ID_PATTERN.test(id)) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `${context}: id "${id}" must be lowercase kebab-case (^[a-z0-9]+(?:-[a-z0-9]+)*$)`,
    );
  }
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
    for (const agentId of fromMeta) {
      assertInstructionId(agentId, `flows/${stem}.metadata.json agents[]`);
    }
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
    for (const agentId of fromFm) {
      assertInstructionId(agentId, `flows/${stem}.agent.md frontmatter agents[]`);
    }
    return fromFm;
  }
  return [];
}

export function collectChatWebInclusions(
  packageDir: string,
  metadata: PackageMetadata,
): ChatWebIncludedEntry[] {
  if (!isChatWebSupported(metadata)) {
    return [];
  }

  const included: ChatWebIncludedEntry[] = [];

  for (const mdFile of listInstructionMdFiles(path.join(packageDir, AGENTS_DIR))) {
    const stem = mdFile.slice(0, -AGENT_FILE_EXT.length);
    const sidecar = readSidecarMetadata(path.join(packageDir, AGENTS_DIR), stem);
    if (isChatWebEntryIncluded(metadata, sidecar['chatWeb'])) {
      assertInstructionId(stem, `agents/${stem}.agent.md`);
      included.push({ kind: 'agent', id: stem });
    }
  }

  for (const mdFile of listInstructionMdFiles(path.join(packageDir, FLOWS_DIR))) {
    const stem = mdFile.slice(0, -AGENT_FILE_EXT.length);
    const flowsDir = path.join(packageDir, FLOWS_DIR);
    const sidecar = readSidecarMetadata(flowsDir, stem);
    if (isChatWebEntryIncluded(metadata, sidecar['chatWeb'])) {
      assertInstructionId(stem, `flows/${stem}.agent.md`);
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

export function isChatWebIncludedInstruction(
  included: ChatWebIncludedEntry[],
  ref: DefaultInstructionRef,
): boolean {
  return included.some((entry) => entry.kind === ref.kind && entry.id === ref.id);
}
