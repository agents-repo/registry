import { ValidationUtils } from '../../validation-utils';
import type { PackageMetadata, ValidationIssue } from '../../types';
import { isStatus, isPackageCostBand } from '../../types';
import { err } from '../common/issues';
import { validateSchemaVersion } from './schema-version';

function validateName(
  m: Record<string, unknown>,
  packageId: string,
  issues: ValidationIssue[],
): void {
  if (typeof m['name'] !== 'string' || m['name'] !== packageId) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `name must equal the package directory name "${packageId}", got: ${JSON.stringify(m['name'])}`,
      ),
    );
  }
}

function validateBasicFields(m: Record<string, unknown>, issues: ValidationIssue[]): void {
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
}

function validateUrls(m: Record<string, unknown>, issues: ValidationIssue[]): void {
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
}

function validateTags(m: Record<string, unknown>, issues: ValidationIssue[]): void {
  if (!Array.isArray(m['tags']) || m['tags'].length < 1 || m['tags'].length > 20) {
    issues.push(err('ERR_METADATA_INVALID', 'tags must be an array of 1 to 20 strings'));
    return;
  }

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

function validateTimestamps(m: Record<string, unknown>, issues: ValidationIssue[]): void {
  if (typeof m['createdAt'] !== 'string' || !ValidationUtils.isRfc3339(m['createdAt'])) {
    issues.push(err('ERR_METADATA_INVALID', 'createdAt must be an RFC 3339 timestamp'));
  }

  if (typeof m['updatedAt'] !== 'string' || !ValidationUtils.isRfc3339(m['updatedAt'])) {
    issues.push(err('ERR_METADATA_INVALID', 'updatedAt must be an RFC 3339 timestamp'));
    return;
  }

  if (
    typeof m['createdAt'] === 'string' &&
    ValidationUtils.isRfc3339(m['createdAt']) &&
    Date.parse(m['updatedAt']) < Date.parse(m['createdAt'])
  ) {
    issues.push(
      err('ERR_METADATA_INVALID', 'updatedAt must be greater than or equal to createdAt'),
    );
  }
}

function validateVersion(m: Record<string, unknown>, issues: ValidationIssue[]): void {
  if (typeof m['version'] !== 'string' || !ValidationUtils.isReleaseVersion(m['version'])) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `version must be a valid semantic version (MAJOR.MINOR.PATCH), got: ${JSON.stringify(m['version'])}`,
      ),
    );
  }
}

function validateStatusAndCategory(m: Record<string, unknown>, issues: ValidationIssue[]): void {
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
}

function validateEstimateOverallCost(m: Record<string, unknown>, issues: ValidationIssue[]): void {
  const estimateOverallCost = m['estimateOverallCost'];
  if (
    typeof estimateOverallCost !== 'object' ||
    estimateOverallCost === null ||
    Array.isArray(estimateOverallCost)
  ) {
    issues.push(err('ERR_METADATA_INVALID', 'estimateOverallCost must be an object'));
    return;
  }

  const cost = estimateOverallCost as Record<string, unknown>;
  if (!isPackageCostBand(cost['band'])) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `estimateOverallCost.band must be one of "minimal", "low", "moderate", "high", "critical", "mixed", got: ${JSON.stringify(cost['band'])}`,
      ),
    );
  }
  if (
    cost['estimatedCost'] !== undefined &&
    (typeof cost['estimatedCost'] !== 'number' ||
      !Number.isFinite(cost['estimatedCost']) ||
      cost['estimatedCost'] < 1 ||
      cost['estimatedCost'] > 10)
  ) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        'estimateOverallCost.estimatedCost must be a finite number between 1 and 10 when provided',
      ),
    );
  }
}

function validateOptionalFields(m: Record<string, unknown>, issues: ValidationIssue[]): void {
  if (
    m['quickstart'] !== undefined &&
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
    m['customAttributes'] !== undefined &&
    (typeof m['customAttributes'] !== 'object' ||
      m['customAttributes'] === null ||
      Array.isArray(m['customAttributes']))
  ) {
    issues.push(
      err('ERR_METADATA_INVALID', 'customAttributes must be an object when provided'),
    );
  }
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

  validateName(m, packageId, issues);
  validateBasicFields(m, issues);
  validateUrls(m, issues);
  validateTags(m, issues);
  validateTimestamps(m, issues);
  validateVersion(m, issues);
  validateStatusAndCategory(m, issues);
  validateEstimateOverallCost(m, issues);
  validateOptionalFields(m, issues);

  return issues.filter((issue) => issue.severity === 'error').length === 0;
}
