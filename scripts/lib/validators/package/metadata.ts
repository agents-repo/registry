import { ValidationUtils } from '../../validation-utils';
import type { PackageMetadata, ValidationIssue } from '../../types';
import { isInstallTargetId, isInstallTargetStatus, isPackageCostBand, isStatus } from '../../types';
import { err } from '../common/issues';
import { validateSchemaVersion } from './schema-version';
import {
  DESCRIPTION_MIN_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  TAGS_MAX_COUNT,
  LICENSE,
  GITHUB_USER_OR_TEAM_SLUG_PATTERN,
  ESTIMATED_COST_MIN,
  ESTIMATED_COST_MAX,
  INSTALL_TARGET_IDS,
  SCHEMA_FAMILY_PACKAGE,
} from '../../constants';

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
    m['description'].length < DESCRIPTION_MIN_LENGTH ||
    m['description'].length > DESCRIPTION_MAX_LENGTH
  ) {
    issues.push(
      err('ERR_METADATA_INVALID', 'description must be a string of 1 to 300 characters'),
    );
  }

  if (typeof m['owner'] !== 'string' || m['owner'].trim().length === 0) {
    issues.push(err('ERR_METADATA_INVALID', 'owner must be a non-empty string'));
  } else if (!GITHUB_USER_OR_TEAM_SLUG_PATTERN.test(m['owner'])) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `owner must be a GitHub owner or organization slug, got: ${JSON.stringify(m['owner'])}`,
      ),
    );
  }

  if (m['license'] !== LICENSE) {
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
  if (!Array.isArray(m['tags']) || m['tags'].length < 1 || m['tags'].length > TAGS_MAX_COUNT) {
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
      !Number.isInteger(cost['estimatedCost']) ||
      cost['estimatedCost'] < ESTIMATED_COST_MIN ||
      cost['estimatedCost'] > ESTIMATED_COST_MAX)
  ) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        'estimateOverallCost.estimatedCost must be an integer between 1 and 10 when provided',
      ),
    );
  }
}

function validateMaintainersField(m: Record<string, unknown>, issues: ValidationIssue[]): void {
  if (m['maintainers'] === undefined) {
    return;
  }

  if (Array.isArray(m['maintainers'])) {
    const maintainers = m['maintainers'] as unknown[];

    for (const maintainer of maintainers) {
      if (
        typeof maintainer !== 'string' ||
        maintainer.trim().length === 0 ||
        !GITHUB_USER_OR_TEAM_SLUG_PATTERN.test(maintainer)
      ) {
        issues.push(
          err(
            'ERR_METADATA_INVALID',
            `maintainers entries must be GitHub usernames or team slugs, got: ${JSON.stringify(maintainer)}`,
          ),
        );
      }
    }

    const duplicateMaintainers = maintainers
      .filter((value): value is string => typeof value === 'string')
      .filter((maintainer, index, all) => all.indexOf(maintainer) !== index);

    if (duplicateMaintainers.length > 0) {
      issues.push(
        err(
          'ERR_METADATA_INVALID',
          `Duplicate maintainers: ${duplicateMaintainers.join(', ')}`,
        ),
      );
    }

    return;
  }

  issues.push(
    err('ERR_METADATA_INVALID', 'maintainers must be an array when provided'),
  );
}

function validateCompatibilityField(m: Record<string, unknown>, issues: ValidationIssue[]): void {
  if (m['compatibility'] === undefined) {
    return;
  }

  const compatibility = m['compatibility'];
  if (typeof compatibility !== 'object' || compatibility === null || Array.isArray(compatibility)) {
    issues.push(err('ERR_METADATA_INVALID', 'compatibility must be an object when provided'));
    return;
  }

  const record = compatibility as Record<string, unknown>;
  if (
    record['canonicalFormat'] !== undefined &&
    (typeof record['canonicalFormat'] !== 'string' || record['canonicalFormat'].trim().length === 0)
  ) {
    issues.push(
      err('ERR_METADATA_INVALID', 'compatibility.canonicalFormat must be a non-empty string when provided'),
    );
  }

  if (!Array.isArray(record['targets']) || record['targets'].length === 0) {
    issues.push(
      err('ERR_METADATA_INVALID', 'compatibility.targets must be a non-empty array when compatibility is provided'),
    );
    return;
  }

  const seen = new Set<string>();
  let hasBuildableTarget = false;
  for (const entry of record['targets']) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      issues.push(
        err('ERR_METADATA_INVALID', 'compatibility.targets entries must be objects'),
      );
      continue;
    }

    const target = entry as Record<string, unknown>;
    if (!isInstallTargetId(target['id'])) {
      issues.push(
        err(
          'ERR_METADATA_INVALID',
          `compatibility.targets id must be one of: ${INSTALL_TARGET_IDS.join(', ')}`,
        ),
      );
    } else if (seen.has(target['id'])) {
      issues.push(
        err('ERR_METADATA_INVALID', `compatibility.targets contains duplicate id: ${target['id']}`),
      );
    } else {
      seen.add(target['id']);
    }

    if (!isInstallTargetStatus(target['status'])) {
      issues.push(
        err(
          'ERR_METADATA_INVALID',
          'compatibility.targets status must be supported, experimental, or planned',
        ),
      );
    } else if (target['status'] === 'supported' || target['status'] === 'experimental') {
      hasBuildableTarget = true;
    }
  }

  if (!hasBuildableTarget) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        'compatibility.targets must include at least one supported or experimental install target',
      ),
    );
  }
}

function validateDocumentationField(m: Record<string, unknown>, issues: ValidationIssue[]): void {
  if (
    m['documentation'] !== undefined &&
    (typeof m['documentation'] !== 'string' || !ValidationUtils.isHttpsUrl(m['documentation']))
  ) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `documentation must be an HTTPS URL when provided, got: ${JSON.stringify(m['documentation'])}`,
      ),
    );
  }
}

function validateKeywordsField(m: Record<string, unknown>, issues: ValidationIssue[]): void {
  if (m['keywords'] === undefined) {
    return;
  }

  if (Array.isArray(m['keywords'])) {
    const keywords = m['keywords'] as unknown[];
    for (const keyword of keywords) {
      if (typeof keyword !== 'string' || keyword.trim().length === 0) {
        issues.push(
          err(
            'ERR_METADATA_INVALID',
            `keywords must contain only non-empty strings, got: ${JSON.stringify(keyword)}`,
          ),
        );
      }
    }

    const duplicateKeywords = keywords
      .filter((value): value is string => typeof value === 'string')
      .filter((keyword, index, all) => all.indexOf(keyword) !== index);

    if (duplicateKeywords.length > 0) {
      issues.push(
        err(
          'ERR_METADATA_INVALID',
          `Duplicate keywords: ${duplicateKeywords.join(', ')}`,
        ),
      );
    }

    return;
  }

  issues.push(err('ERR_METADATA_INVALID', 'keywords must be an array when provided'));
}

function validateQuickstartField(m: Record<string, unknown>, issues: ValidationIssue[]): void {
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
}

function validateCustomAttributesField(m: Record<string, unknown>, issues: ValidationIssue[]): void {
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

function validateOptionalFields(m: Record<string, unknown>, issues: ValidationIssue[]): void {
  validateMaintainersField(m, issues);
  validateCompatibilityField(m, issues);
  validateDocumentationField(m, issues);
  validateKeywordsField(m, issues);
  validateQuickstartField(m, issues);
  validateCustomAttributesField(m, issues);
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
    family: SCHEMA_FAMILY_PACKAGE,
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
