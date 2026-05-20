import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';
import { ValidationUtils } from '../../validation-utils';
import type { ValidationIssue } from '../../types';
import {
  AGENT_FILE_EXT,
  MANIFEST_FILENAME,
  METADATA_FILENAME,
  VERSIONS_DIR,
} from '../../constants';
import { err } from '../common/issues';
import { readJsonFile } from './json-reader';
import type { EntryVersion } from './entries';

export function validateMetadataVersionAgainstManifestLatest(
  packageDir: string,
  metadata: unknown,
  issues: ValidationIssue[],
): void {
  const manifestPath = path.join(packageDir, VERSIONS_DIR, MANIFEST_FILENAME);
  if (!fs.existsSync(manifestPath)) {
    return;
  }

  const { data: manifestData } = readJsonFile(manifestPath);
  if (!manifestData || typeof manifestData !== 'object') {
    return;
  }

  const manifestLatest = (manifestData as Record<string, unknown>)['latest'];
  const metaVersion =
    metadata && typeof metadata === 'object'
      ? (metadata as Record<string, unknown>)['version']
      : undefined;

  if (
    typeof metaVersion === 'string' &&
    typeof manifestLatest === 'string' &&
    ValidationUtils.isReleaseVersion(metaVersion) &&
    ValidationUtils.isReleaseVersion(manifestLatest) &&
    semver.lt(metaVersion, manifestLatest)
  ) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `${METADATA_FILENAME} version "${metaVersion}" must be >= ${MANIFEST_FILENAME} latest "${manifestLatest}"`,
      ),
    );
  }
}

export function validateSharedFrontmatterVersion(
  entries: EntryVersion[],
  issues: ValidationIssue[],
): string | undefined {
  const versions = entries.map((entry) => entry.frontmatterVersion).filter(Boolean);
  if (versions.length === 0) {
    return undefined;
  }

  const unique = new Set(versions);
  if (unique.size > 1) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `All ${AGENT_FILE_EXT} files must share one identical frontmatter version; found: ${Array.from(unique).join(', ')}`,
      ),
    );
    return undefined;
  }

  return Array.from(unique)[0];
}

export function validateFrontmatterVersionMatchesMetadata(
  packageDir: string,
  sharedFrontmatterVersion: string | undefined,
  issues: ValidationIssue[],
): void {
  if (!sharedFrontmatterVersion) {
    return;
  }

  const metadataPath = path.join(packageDir, METADATA_FILENAME);
  if (!fs.existsSync(metadataPath)) {
    return;
  }

  const { data: metadata } = readJsonFile(metadataPath);
  if (!metadata || typeof metadata !== 'object') {
    return;
  }

  const metadataVersion = (metadata as Record<string, unknown>)['version'];
  if (
    typeof metadataVersion === 'string' &&
    ValidationUtils.isReleaseVersion(metadataVersion) &&
    sharedFrontmatterVersion !== metadataVersion
  ) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `Frontmatter version "${sharedFrontmatterVersion}" in ${AGENT_FILE_EXT} files does not match ${METADATA_FILENAME} version "${metadataVersion}"`,
      ),
    );
  }
}
