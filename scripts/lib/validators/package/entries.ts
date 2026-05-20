import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatterData } from '../../frontmatter';
import { ValidationUtils } from '../../validation-utils';
import type { SchemaFamily } from '../../schema-versions';
import type { ValidationIssue } from '../../types';
import { isStatus, isCostBand } from '../../types';
import { err, warn } from '../common/issues';
import { readJsonFile } from './json-reader';
import { validateSchemaVersion } from './schema-version';
import {
  ESTIMATED_COST_MIN,
  ESTIMATED_COST_MAX,
  DESCRIPTION_MIN_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  CONTRACT_NAME_MIN_LENGTH,
  CONTRACT_NAME_MAX_LENGTH,
  CONTRACT_NAME_PATTERN,
  CONTRACT_ALLOWED_TYPES,
  CONTRACT_REQUIRED_KEYS,
  LICENSE,
  SCHEMA_FAMILY_AGENT,
  SCHEMA_FAMILY_FLOW,
  AGENT_FILE_EXT,
  AGENT_METADATA_EXT,
} from '../../constants';

const CONTRACT_TYPES: ReadonlySet<string> = new Set(CONTRACT_ALLOWED_TYPES);

function validateStringArrayField(
  value: unknown,
  fieldName: string,
  context: string,
  issues: ValidationIssue[],
): value is string[] {
  if (!Array.isArray(value)) {
    issues.push(err('ERR_METADATA_INVALID', `${context}: ${fieldName} must be an array when provided`));
    return false;
  }

  for (const item of value) {
    if (typeof item !== 'string' || item.trim().length === 0) {
      issues.push(
        err(
          'ERR_METADATA_INVALID',
          `${context}: ${fieldName} must contain only non-empty strings`,
        ),
      );
    }
  }

  const duplicateValues = value
    .filter((item): item is string => typeof item === 'string')
    .filter((item, index, all) => all.indexOf(item) !== index);
  if (duplicateValues.length > 0) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `${context}: ${fieldName} must not contain duplicates: ${duplicateValues.join(', ')}`,
      ),
    );
  }

  return true;
}

function validateContractArray(
  value: unknown,
  fieldName: 'inputs' | 'outputs',
  context: string,
  issues: ValidationIssue[],
): value is Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    issues.push(err('ERR_METADATA_INVALID', `${context}: ${fieldName} must be an array when provided`));
    return false;
  }

  const names: string[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      issues.push(
        err(
          'ERR_METADATA_INVALID',
          `${context}: ${fieldName} entries must be objects with name, type, and description`,
        ),
      );
      continue;
    }

    const contract = item as Record<string, unknown>;
    const keys = Object.keys(contract).sort();
    if (keys.join(',') !== CONTRACT_REQUIRED_KEYS) {
      issues.push(
        err(
          'ERR_METADATA_INVALID',
          `${context}: ${fieldName} entries must contain exactly name, type, and description`,
        ),
      );
    }

    const name = contract['name'];
    if (
      typeof name !== 'string' ||
      name.length < CONTRACT_NAME_MIN_LENGTH ||
      name.length > CONTRACT_NAME_MAX_LENGTH ||
      !CONTRACT_NAME_PATTERN.test(name)
    ) {
      issues.push(
        err(
          'ERR_METADATA_INVALID',
          `${context}: ${fieldName}.name must match ^[a-z][a-z0-9_-]*$ and be 1 to 64 characters`,
        ),
      );
    } else {
      names.push(name);
    }

    const type = contract['type'];
    if (typeof type !== 'string' || !CONTRACT_TYPES.has(type)) {
      issues.push(
        err(
          'ERR_METADATA_INVALID',
          `${context}: ${fieldName}.type must be one of string, number, boolean, object, array`,
        ),
      );
    }

    const description = contract['description'];
    if (
      typeof description !== 'string' ||
      description.length < DESCRIPTION_MIN_LENGTH ||
      description.length > DESCRIPTION_MAX_LENGTH
    ) {
      issues.push(
        err(
          'ERR_METADATA_INVALID',
          `${context}: ${fieldName}.description must be a string of 1 to 300 characters`,
        ),
      );
    }
  }

  const duplicateNames = names.filter((name, index, all) => all.indexOf(name) !== index);
  if (duplicateNames.length > 0) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `${context}: ${fieldName} contract names must be unique: ${duplicateNames.join(', ')}`,
      ),
    );
  }

  return true;
}

function validateEntryMetadataOptionalFields(
  md: Record<string, unknown>,
  dirLabel: 'agents' | 'flows',
  context: string,
  issues: ValidationIssue[],
): void {
  if (md['tools'] !== undefined) {
    if (dirLabel !== 'agents') {
      issues.push(err('ERR_METADATA_INVALID', `${context}: tools is only valid for agent metadata`));
    } else {
      validateStringArrayField(md['tools'], 'tools', context, issues);
    }
  }

  if (md['agents'] !== undefined) {
    if (dirLabel !== 'flows') {
      issues.push(err('ERR_METADATA_INVALID', `${context}: agents is only valid for flow metadata`));
    } else {
      validateStringArrayField(md['agents'], 'agents', context, issues);
    }
  }

  if (md['inputs'] !== undefined) {
    validateContractArray(md['inputs'], 'inputs', context, issues);
  }

  if (md['outputs'] !== undefined) {
    validateContractArray(md['outputs'], 'outputs', context, issues);
  }
}

function normalizeFrontmatterSyncValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeFrontmatterSyncValue(item));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};

    for (const key of Object.keys(record).sort()) {
      normalized[key] = normalizeFrontmatterSyncValue(record[key]);
    }

    return normalized;
  }

  return value;
}

function valuesEqualForFrontmatterSync(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(normalizeFrontmatterSyncValue(left)) ===
    JSON.stringify(normalizeFrontmatterSyncValue(right))
  );
}

function validateFrontmatterParity(
  frontmatter: Record<string, unknown>,
  metadata: Record<string, unknown> | undefined,
  dirLabel: 'agents' | 'flows',
  stem: string,
  issues: ValidationIssue[],
): void {
  if (!metadata) {
    return;
  }

  const context = `${dirLabel}/${stem}.metadata.json`;
  const sharedFields = dirLabel === 'agents'
    ? ['description', 'tools', 'inputs', 'outputs']
    : ['description', 'agents', 'inputs', 'outputs'];

  for (const field of sharedFields) {
    if (frontmatter[field] !== undefined && metadata[field] !== undefined) {
      if (!valuesEqualForFrontmatterSync(frontmatter[field], metadata[field])) {
        issues.push(
          err(
            'ERR_METADATA_INVALID',
            `${context}: ${field} must match ${dirLabel}/${stem}.agent.md frontmatter when present in both`,
          ),
        );
      }
    }
  }
}

function validateEntryMetadataRequiredFields(
  md: Record<string, unknown>,
  dirLabel: 'agents' | 'flows',
  stem: string,
  context: string,
  issues: ValidationIssue[],
): void {
  if (typeof md['name'] !== 'string' || md['name'] !== stem) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `${context}: name must equal the entry stem "${stem}", got: ${JSON.stringify(md['name'])}`,
      ),
    );
  }

  if (
    typeof md['description'] !== 'string' ||
    md['description'].length < DESCRIPTION_MIN_LENGTH ||
    md['description'].length > DESCRIPTION_MAX_LENGTH
  ) {
    issues.push(
      err('ERR_METADATA_INVALID', `${context}: description must be a string of 1 to 300 characters`),
    );
  }

  if (md['license'] !== LICENSE) {
    issues.push(
      err('ERR_METADATA_INVALID', `${context}: license must be "MIT", got: ${JSON.stringify(md['license'])}`),
    );
  }

  if (!isStatus(md['status'])) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `${context}: status must be one of "active", "deprecated", "archived", "yanked"`,
      ),
    );
  }

  if (typeof md['category'] !== 'string' || md['category'].trim().length === 0) {
    issues.push(err('ERR_METADATA_INVALID', `${context}: category must be a non-empty string`));
  }

  const estimateCost = md['estimateCost'];
  if (
    typeof estimateCost !== 'object' ||
    estimateCost === null ||
    Array.isArray(estimateCost)
  ) {
    issues.push(err('ERR_METADATA_INVALID', `${context}: estimateCost must be an object`));
  } else {
    const cost = estimateCost as Record<string, unknown>;
    if (
      typeof cost['estimatedCost'] !== 'number' ||
      !Number.isFinite(cost['estimatedCost']) ||
      !Number.isInteger(cost['estimatedCost']) ||
      cost['estimatedCost'] < ESTIMATED_COST_MIN ||
      cost['estimatedCost'] > ESTIMATED_COST_MAX
    ) {
      issues.push(
        err(
          'ERR_METADATA_INVALID',
          `${context}: estimateCost.estimatedCost must be an integer between 1 and 10`,
        ),
      );
    }
    if (!isCostBand(cost['band'])) {
      issues.push(
        err(
          'ERR_METADATA_INVALID',
          `${context}: estimateCost.band must be one of "minimal", "low", "moderate", "high", "critical"`,
        ),
      );
    }
  }

  if (
    md['customAttributes'] !== undefined &&
    (typeof md['customAttributes'] !== 'object' ||
      md['customAttributes'] === null ||
      Array.isArray(md['customAttributes']))
  ) {
    issues.push(err('ERR_METADATA_INVALID', `${context}: customAttributes must be an object when provided`));
  }

  validateEntryMetadataOptionalFields(md, dirLabel, context, issues);
}

export interface EntryVersion {
  id: string;
  frontmatterVersion: string;
}

export function validateHasEntries(
  agentEntries: EntryVersion[],
  flowEntries: EntryVersion[],
  issues: ValidationIssue[],
): void {
  if (agentEntries.length === 0 && flowEntries.length === 0) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        'Package must contain at least one agent (agents/) or flow (flows/)',
      ),
    );
  }
}

export function validateUniqueIdsAcrossEntryTypes(
  agentEntries: EntryVersion[],
  flowEntries: EntryVersion[],
  issues: ValidationIssue[],
): void {
  const agentIds = new Set(agentEntries.map((entry) => entry.id));
  for (const flowEntry of flowEntries) {
    if (agentIds.has(flowEntry.id)) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `ID "${flowEntry.id}" is used in both agents/ and flows/; IDs must be unique across both`,
        ),
      );
    }
  }
}

function validateMetadataSidecar(
  metaPath: string,
  dirLabel: 'agents' | 'flows',
  stem: string,
  issues: ValidationIssue[],
): Record<string, unknown> | undefined {
  if (!fs.existsSync(metaPath)) {
    return undefined;
  }

  const { data: metaData, error: metaError } = readJsonFile(metaPath);
  if (metaError) {
    issues.push(err('ERR_METADATA_INVALID', metaError));
    return undefined;
  }

  if (typeof metaData !== 'object' || metaData === null) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `${dirLabel}/${stem}.metadata.json: metadata must be a JSON object`,
      ),
    );
    return undefined;
  }

  const md = metaData as Record<string, unknown>;
  const family: SchemaFamily = dirLabel === 'agents' ? SCHEMA_FAMILY_AGENT : SCHEMA_FAMILY_FLOW;
  validateSchemaVersion(issues, {
    family,
    value: md['schemaVersion'],
    context: `${dirLabel}/${stem}.metadata.json`,
    errorCode: 'ERR_METADATA_INVALID',
  });

  validateEntryMetadataRequiredFields(
    md,
    dirLabel,
    stem,
    `${dirLabel}/${stem}.metadata.json`,
    issues,
  );

  return md;
}

function validateFrontmatter(
  mdPath: string,
  dirLabel: 'agents' | 'flows',
  mdFile: string,
  stem: string,
  issues: ValidationIssue[],
): Record<string, unknown> {
  const content = fs.readFileSync(mdPath, 'utf-8');
  const frontmatter = parseFrontmatterData(content);
  const context = `${dirLabel}/${mdFile} frontmatter`;

  if (typeof frontmatter['name'] !== 'string' || frontmatter['name'] !== stem) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `${dirLabel}/${mdFile}: frontmatter name "${frontmatter['name']}" must equal stem "${stem}"`,
      ),
    );
  }

  if (
    typeof frontmatter['version'] !== 'string' ||
    !ValidationUtils.isReleaseVersion(frontmatter['version'])
  ) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `${dirLabel}/${mdFile}: frontmatter version must be a MAJOR.MINOR.PATCH release version, got: ${JSON.stringify(frontmatter['version'])}`,
      ),
    );
  }

  if (
    typeof frontmatter['description'] !== 'string' ||
    frontmatter['description'].length < DESCRIPTION_MIN_LENGTH ||
    frontmatter['description'].length > DESCRIPTION_MAX_LENGTH
  ) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `${dirLabel}/${mdFile}: frontmatter description must be a string of 1 to 300 characters`,
      ),
    );
  }

  if (typeof frontmatter['license'] !== 'string' || frontmatter['license'] !== LICENSE) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `${dirLabel}/${mdFile}: frontmatter license must be "MIT", got: ${JSON.stringify(frontmatter['license'])}`,
      ),
    );
  }

  validateEntryMetadataOptionalFields(frontmatter, dirLabel, context, issues);

  return frontmatter;
}

function validateSingleEntryFile(
  entryDir: string,
  dirLabel: 'agents' | 'flows',
  mdFile: string,
  issues: ValidationIssue[],
): EntryVersion {
  const stem = mdFile.endsWith(AGENT_FILE_EXT)
    ? mdFile.slice(0, -AGENT_FILE_EXT.length)
    : mdFile;
  const mdPath = path.join(entryDir, mdFile);
  const metaPath = path.join(entryDir, `${stem}${AGENT_METADATA_EXT}`);

  if (!fs.existsSync(metaPath)) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `${dirLabel}/${stem}${AGENT_METADATA_EXT} is missing (required for ${mdFile})`,
      ),
    );
  }

  const metadata = validateMetadataSidecar(metaPath, dirLabel, stem, issues);
  const frontmatter = validateFrontmatter(mdPath, dirLabel, mdFile, stem, issues);
  validateFrontmatterParity(frontmatter, metadata, dirLabel, stem, issues);

  const frontmatterVersion =
    typeof frontmatter['version'] === 'string' ? frontmatter['version'] : '';
  return { id: stem, frontmatterVersion };
}

function warnUnmatchedMetadataFiles(
  files: string[],
  agentMdFiles: string[],
  dirLabel: 'agents' | 'flows',
  issues: ValidationIssue[],
): void {
  const metaFiles = files.filter(
    (fileName) => fileName.endsWith(AGENT_METADATA_EXT) && !fileName.startsWith('.'),
  );

  for (const metaFile of metaFiles) {
    const stem = metaFile.slice(0, -AGENT_METADATA_EXT.length);
    if (!agentMdFiles.includes(`${stem}${AGENT_FILE_EXT}`)) {
      issues.push(warn(`${dirLabel}/${metaFile}: found ${AGENT_METADATA_EXT} with no matching ${AGENT_FILE_EXT}`));
    }
  }
}

export function validateEntryFiles(
  entryDir: string,
  dirLabel: 'agents' | 'flows',
  issues: ValidationIssue[],
): EntryVersion[] {
  const entries: EntryVersion[] = [];

  if (!fs.existsSync(entryDir)) {
    return entries;
  }

  const files = fs.readdirSync(entryDir);
  const agentMdFiles = files.filter((fileName) => fileName.endsWith(AGENT_FILE_EXT));

  for (const mdFile of agentMdFiles) {
    entries.push(validateSingleEntryFile(entryDir, dirLabel, mdFile, issues));
  }

  warnUnmatchedMetadataFiles(files, agentMdFiles, dirLabel, issues);

  return entries;
}
