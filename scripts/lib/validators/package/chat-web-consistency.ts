import fs from 'node:fs';
import path from 'node:path';
import { getChatWebDefaultInstruction, isChatWebSupported } from '../../compatibility';
import {
  collectChatWebInclusions,
  isChatWebIncludedInstruction,
} from '../../chat-web-inclusions';
import { AGENT_METADATA_EXT, AGENTS_DIR, FLOWS_DIR } from '../../constants';
import { PackageError } from '../../errors';
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

export function validateChatWebDefaultInstruction(
  packageDir: string,
  metadata: PackageMetadata,
  issues: ValidationIssue[],
): void {
  const defaultRef = getChatWebDefaultInstruction(metadata);
  if (defaultRef === undefined || !isChatWebSupported(metadata)) {
    return;
  }

  let included;
  try {
    included = collectChatWebInclusions(packageDir, metadata);
  } catch (error) {
    if (error instanceof PackageError) {
      issues.push(err(error.code, error.message));
      return;
    }
    throw error;
  }

  if (!isChatWebIncludedInstruction(included, defaultRef)) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `compatibility.consumption defaultInstruction (${defaultRef.kind}/${defaultRef.id}) ` +
          'must reference an included chat-web instruction',
      ),
    );
  }
}
