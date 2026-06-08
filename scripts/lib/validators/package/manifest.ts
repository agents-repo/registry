import semver from 'semver';
import { ValidationUtils } from '../../validation-utils';
import type { Manifest, ValidationIssue } from '../../types';
import { isInstallTargetId } from '../../types';
import { err } from '../common/issues';
import { readJsonFile } from './json-reader';
import { validateSchemaVersion } from './schema-version';
import {
  SHA256_PATTERN,
  SCHEMA_FAMILY_MANIFEST,
  SOURCE_ARCHIVE_SUFFIX,
  TARGET_ARTIFACT_FILE_PATTERN,
  buildTargetArtifactFileName,
} from '../../constants';

function addVersionUniquenessIssue(versionSet: Set<string>, ver: string, issues: ValidationIssue[]): void {
  if (versionSet.has(ver)) {
    issues.push(err('ERR_VALIDATION_FAILED', `manifest.json duplicate version entry: ${ver}`));
  }
  versionSet.add(ver);
}

function validateArtifactEntry(
  artifact: unknown,
  ver: string,
  issues: ValidationIssue[],
  seenTargets: Set<string>,
): void {
  if (typeof artifact !== 'object' || artifact === null || Array.isArray(artifact)) {
    issues.push(err('ERR_VALIDATION_FAILED', `manifest.json version ${ver}: artifacts entries must be objects`));
    return;
  }

  const record = artifact as Record<string, unknown>;
  const allowedKeys = new Set(['target', 'file', 'sha256']);
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `manifest.json version ${ver}: artifact entry contains unknown field "${key}"`,
        ),
      );
    }
  }

  const target = record['target'];
  const file = record['file'];
  const sha256 = record['sha256'];

  if (!isInstallTargetId(target)) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json version ${ver}: artifact target must be a supported install target id`,
      ),
    );
  } else if (seenTargets.has(target)) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json version ${ver}: duplicate artifact target "${target}"`,
      ),
    );
  } else {
    seenTargets.add(target);
  }

  const expectedFile = isInstallTargetId(target) ? buildTargetArtifactFileName(ver, target) : null;
  if (typeof file !== 'string' || !TARGET_ARTIFACT_FILE_PATTERN.test(file)) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json version ${ver}: artifact file must match <version>-<target-id>.zip`,
      ),
    );
  } else if (expectedFile !== null && file !== expectedFile) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json version ${ver}: artifact file must be "${expectedFile}", got: ${JSON.stringify(file)}`,
      ),
    );
  }

  if (typeof sha256 !== 'string' || !SHA256_PATTERN.test(sha256)) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json version ${ver}: artifact sha256 must be 64 lowercase hex characters`,
      ),
    );
  }
}

function validateVersionEntryFields(e: Record<string, unknown>, ver: string, issues: ValidationIssue[]): void {
  if (e['srcArtifact'] !== `${ver}${SOURCE_ARCHIVE_SUFFIX}`) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json version ${ver}: srcArtifact must be "${ver}${SOURCE_ARCHIVE_SUFFIX}"`,
      ),
    );
  }

  if (typeof e['srcSha256'] !== 'string' || !SHA256_PATTERN.test(e['srcSha256'])) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json version ${ver}: srcSha256 must be 64 lowercase hex characters`,
      ),
    );
  }

  if (!Array.isArray(e['artifacts']) || e['artifacts'].length === 0) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json version ${ver}: artifacts must be a non-empty array`,
      ),
    );
    return;
  }

  const seenTargets = new Set<string>();
  for (const artifact of e['artifacts'] as unknown[]) {
    validateArtifactEntry(artifact, ver, issues, seenTargets);
  }

  if (typeof e['createdAt'] !== 'string' || !ValidationUtils.isRfc3339(e['createdAt'])) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json version ${ver}: createdAt must be an RFC 3339 timestamp`,
      ),
    );
  }
}

function validateVersionEntry(
  entry: unknown,
  issues: ValidationIssue[],
  versionSet: Set<string>,
): void {
  if (typeof entry !== 'object' || entry === null) {
    issues.push(err('ERR_VALIDATION_FAILED', 'manifest.json versions entries must be objects'));
    return;
  }

  const e = entry as Record<string, unknown>;
  const ver = e['version'];

  if (typeof ver !== 'string' || !ValidationUtils.isReleaseVersion(ver)) {
    issues.push(
      err('ERR_VALIDATION_FAILED', 'manifest.json version entry "version" must be a MAJOR.MINOR.PATCH release version'),
    );
    return;
  }

  addVersionUniquenessIssue(versionSet, ver, issues);
  validateVersionEntryFields(e, ver, issues);
}

function validateLatestMatchesMax(
  latest: unknown,
  versionSet: Set<string>,
  issues: ValidationIssue[],
): void {
  if (typeof latest !== 'string' || !ValidationUtils.isReleaseVersion(latest) || versionSet.size === 0) {
    return;
  }

  const versions = Array.from(versionSet);
  const maxVer = semver.maxSatisfying(versions, '*');
  if (maxVer !== latest) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json latest "${latest}" must equal the maximum version "${maxVer}"`,
      ),
    );
  }
}

export function validateManifest(
  manifestPath: string,
  packageId: string,
  issues: ValidationIssue[],
): Manifest | null {
  const { data, error } = readJsonFile(manifestPath);
  if (error !== undefined) {
    issues.push(err('ERR_VALIDATION_FAILED', error));
    return null;
  }

  const m = data as Record<string, unknown>;

  validateSchemaVersion(issues, {
    family: SCHEMA_FAMILY_MANIFEST,
    value: m['schemaVersion'],
    context: 'manifest.json',
    errorCode: 'ERR_VALIDATION_FAILED',
  });

  if (typeof m['name'] !== 'string' || m['name'] !== packageId) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json name must equal "${packageId}", got: ${JSON.stringify(m['name'])}`,
      ),
    );
  }

  if (typeof m['latest'] !== 'string') {
    issues.push(err('ERR_VALIDATION_FAILED', 'manifest.json latest must be a string'));
  } else if (!ValidationUtils.isReleaseVersion(m['latest'])) {
    issues.push(
      err('ERR_VALIDATION_FAILED', 'manifest.json latest must be a MAJOR.MINOR.PATCH release version'),
    );
  }

  if (!Array.isArray(m['versions'])) {
    issues.push(err('ERR_VALIDATION_FAILED', 'manifest.json versions must be an array'));
    return m as unknown as Manifest;
  }

  if (m['versions'].length === 0) {
    issues.push(
      err('ERR_VALIDATION_FAILED', 'manifest.json versions must contain at least one entry'),
    );
    return m as unknown as Manifest;
  }

  const versionSet = new Set<string>();
  for (const entry of m['versions'] as unknown[]) {
    validateVersionEntry(entry, issues, versionSet);
  }

  validateLatestMatchesMax(m['latest'], versionSet, issues);

  return m as unknown as Manifest;
}
