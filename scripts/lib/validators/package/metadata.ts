import { ValidationUtils } from '../../validation-utils';
import type { PackageMetadata, ValidationIssue } from '../../types';
import { err } from '../common/issues';
import { validateSchemaVersion } from './schema-version';

export function validateMetadata(
  metadata: unknown,
  packageId: string,
  issues: ValidationIssue[],
): metadata is PackageMetadata {
  if (typeof metadata !== 'object' || metadata === null) {
    issues.push(err('ERR_METADATA_INVALID', 'metadata.json must be a JSON object'));
    return false;
  }

  const m = metadata as Record<string, unknown>;
  validateSchemaVersion(issues, {
    family: 'metadata.package',
    value: m['schemaVersion'],
    context: 'metadata.json',
    errorCode: 'ERR_METADATA_INVALID',
  });

  if (typeof m['name'] !== 'string' || m['name'] !== packageId) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `name must equal the package directory name "${packageId}", got: ${JSON.stringify(m['name'])}`,
      ),
    );
  }

  if (
    typeof m['description'] !== 'string' ||
    m['description'].length < 1 ||
    m['description'].length > 300
  ) {
    issues.push(
      err('ERR_METADATA_INVALID', 'description must be a string of 1 to 300 characters'),
    );
  }

  if (typeof m['owner'] !== 'string' || m['owner'].length === 0) {
    issues.push(err('ERR_METADATA_INVALID', 'owner must be a non-empty string'));
  }

  if (m['license'] !== 'MIT') {
    issues.push(
      err('ERR_METADATA_INVALID', `license must be "MIT", got: ${JSON.stringify(m['license'])}`),
    );
  }

  if (typeof m['homepage'] !== 'string' || !ValidationUtils.isHttpsUrl(m['homepage'])) {
    issues.push(
      err('ERR_METADATA_INVALID', `homepage must be an HTTPS URL, got: ${JSON.stringify(m['homepage'])}`),
    );
  }

  if (typeof m['repository'] !== 'string' || !ValidationUtils.isHttpsUrl(m['repository'])) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `repository must be an HTTPS URL, got: ${JSON.stringify(m['repository'])}`,
      ),
    );
  }

  if (!Array.isArray(m['tags']) || m['tags'].length < 1 || m['tags'].length > 20) {
    issues.push(err('ERR_METADATA_INVALID', 'tags must be an array of 1 to 20 strings'));
  } else {
    for (const tag of m['tags'] as unknown[]) {
      if (typeof tag !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(tag)) {
        issues.push(
          err('ERR_METADATA_INVALID', `Each tag must be a lowercase string, got: ${JSON.stringify(tag)}`),
        );
      }
    }
    const dupes = (m['tags'] as string[]).filter((tag, index, all) => all.indexOf(tag) !== index);
    if (dupes.length > 0) {
      issues.push(err('ERR_METADATA_INVALID', `Duplicate tags: ${dupes.join(', ')}`));
    }
  }

  if (typeof m['createdAt'] !== 'string' || !ValidationUtils.isRfc3339(m['createdAt'])) {
    issues.push(err('ERR_METADATA_INVALID', 'createdAt must be an RFC 3339 timestamp'));
  }

  if (typeof m['updatedAt'] !== 'string' || !ValidationUtils.isRfc3339(m['updatedAt'])) {
    issues.push(err('ERR_METADATA_INVALID', 'updatedAt must be an RFC 3339 timestamp'));
  } else if (
    typeof m['createdAt'] === 'string' &&
    ValidationUtils.isRfc3339(m['createdAt']) &&
    Date.parse(m['updatedAt'] as string) < Date.parse(m['createdAt'] as string)
  ) {
    issues.push(
      err('ERR_METADATA_INVALID', 'updatedAt must be greater than or equal to createdAt'),
    );
  }

  if (
    typeof m['version'] !== 'string' ||
    !ValidationUtils.isReleaseVersion(m['version'])
  ) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `version must be a valid semantic version (MAJOR.MINOR.PATCH), got: ${JSON.stringify(m['version'])}`,
      ),
    );
  }

  return issues.filter((issue) => issue.severity === 'error').length === 0;
}
