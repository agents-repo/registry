import fs from 'node:fs';
import path from 'node:path';
import { isChatWebSupported } from '../../compatibility';
import { AGENT_METADATA_EXT, AGENTS_DIR, FLOWS_DIR } from '../../constants';
import { readJsonFile } from '../../io/json';
import type { PackageMetadata, ValidationIssue } from '../../types';
import { err } from '../common/issues';

function validateSidecarChatWebIncluded(
  metaPath: string,
  context: string,
  issues: ValidationIssue[],
): void {
  if (!fs.existsSync(metaPath)) {
    return;
  }

  let record: Record<string, unknown>;
  try {
    record = readJsonFile<Record<string, unknown>>(metaPath);
  } catch {
    return;
  }

  if (record['chatWeb'] === 'included') {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `${context}: chatWeb "included" requires package compatibility.consumption chat-web status supported`,
      ),
    );
  }
}

function scanEntryDir(
  packageDir: string,
  dirName: typeof AGENTS_DIR | typeof FLOWS_DIR,
  issues: ValidationIssue[],
): void {
  const entryDir = path.join(packageDir, dirName);
  if (!fs.existsSync(entryDir)) {
    return;
  }

  for (const fileName of fs.readdirSync(entryDir)) {
    if (!fileName.endsWith(AGENT_METADATA_EXT)) {
      continue;
    }
    const stem = fileName.slice(0, -AGENT_METADATA_EXT.length);
    validateSidecarChatWebIncluded(
      path.join(entryDir, fileName),
      `${dirName}/${stem}.metadata.json`,
      issues,
    );
  }
}

export function validateChatWebIncludedRequiresSupportedChannel(
  packageDir: string,
  metadata: PackageMetadata,
  issues: ValidationIssue[],
): void {
  if (isChatWebSupported(metadata)) {
    return;
  }

  scanEntryDir(packageDir, AGENTS_DIR, issues);
  scanEntryDir(packageDir, FLOWS_DIR, issues);
}
