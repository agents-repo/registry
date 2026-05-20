import semver from 'semver';
import { ValidationUtils } from '../../validation-utils';
import type { Manifest, ValidationIssue } from '../../types';
import { err } from '../common/issues';
import { readJsonFile } from './json-reader';
import { validateSchemaVersion } from './schema-version';
import { SHA256_PATTERN, SCHEMA_FAMILY_MANIFEST, SOURCE_ARCHIVE_SUFFIX } from '../../constants';

function addVersionUniquenessIssue(versionSet: Set<string>, ver: string, issues: ValidationIssue[]): void {
  if (versionSet.has(ver)) {
    issues.push(err('ERR_VALIDATION_FAILED', `manifest.json duplicate version entry: ${ver}`));
  }
  versionSet.add(ver);
}

function validateVersionEntryFields(e: Record<string, unknown>, ver: string, issues: ValidationIssue[]): void {
  if (e['artifact'] !== `${ver}.zip`) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json version ${ver}: artifact must be "${ver}.zip"`,
      ),
    );
  }

  if (e['srcArtifact'] !== `${ver}${SOURCE_ARCHIVE_SUFFIX}`) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json version ${ver}: srcArtifact must be "${ver}${SOURCE_ARCHIVE_SUFFIX}"`,
      ),
    );
  }

  if (typeof e['sha256'] !== 'string' || !SHA256_PATTERN.test(e['sha256'])) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json version ${ver}: sha256 must be 64 lowercase hex characters`,
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
  if (error) {
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
