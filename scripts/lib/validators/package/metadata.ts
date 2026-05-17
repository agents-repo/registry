import { ValidationUtils } from '../../validation-utils';
import type { PackageMetadata, ValidationIssue } from '../../types';
import { err } from '../common/issues';
import { validateSchemaVersion } from './schema-version';

function isStatus(value: unknown): value is 'active' | 'deprecated' | 'archived' | 'yanked' {
  return value === 'active' || value === 'deprecated' || value === 'archived' || value === 'yanked';
}

function isBand(value: unknown): value is 'low' | 'medium' | 'high' | 'mixed' {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'mixed';
}

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

  const schemaVersion = m['schemaVersion'];
  if (schemaVersion === '1.1.0') {
    if (!isStatus(m['status'])) {
      issues.push(
        err(
          'ERR_METADATA_INVALID',
          `status must be one of "active", "deprecated", "archived", "yanked", got: ${JSON.stringify(m['status'])}`,
        ),
      );
    }

    if (typeof m['category'] !== 'string' || m['category'].trim().length === 0) {
      issues.push(err('ERR_METADATA_INVALID', 'category must be a non-empty string'));
    }

    const estimateOverallCost = m['estimateOverallCost'];
    if (typeof estimateOverallCost !== 'object' || estimateOverallCost === null) {
      issues.push(err('ERR_METADATA_INVALID', 'estimateOverallCost must be an object'));
    } else {
      const cost = estimateOverallCost as Record<string, unknown>;
      if (!isBand(cost['band'])) {
        issues.push(
          err(
            'ERR_METADATA_INVALID',
            `estimateOverallCost.band must be one of "low", "medium", "high", "mixed", got: ${JSON.stringify(cost['band'])}`,
          ),
        );
      }
      if (
        typeof cost['estimatedCost'] !== 'undefined' &&
        (typeof cost['estimatedCost'] !== 'number' || Number.isNaN(cost['estimatedCost']))
      ) {
        issues.push(
          err('ERR_METADATA_INVALID', 'estimateOverallCost.estimatedCost must be a number when provided'),
        );
      }
    }
  }

  if (
    typeof m['quickstart'] !== 'undefined' &&
    (typeof m['quickstart'] !== 'string' || !ValidationUtils.isHttpsUrl(m['quickstart']))
  ) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `quickstart must be an HTTPS URL when provided, got: ${JSON.stringify(m['quickstart'])}`,
      ),
    );
  }

  if (
    typeof m['customAttributes'] !== 'undefined' &&
    (typeof m['customAttributes'] !== 'object' || m['customAttributes'] === null || Array.isArray(m['customAttributes']))
  ) {
    issues.push(
      err('ERR_METADATA_INVALID', 'customAttributes must be an object when provided'),
    );
  }

  return issues.filter((issue) => issue.severity === 'error').length === 0;
}
