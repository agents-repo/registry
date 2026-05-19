import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../../frontmatter';
import { ValidationUtils } from '../../validation-utils';
import type { SchemaFamily } from '../../schema-versions';
import type { ValidationIssue } from '../../types';
import { isStatus, isCostBand } from '../../types';
import { err, warn } from '../common/issues';
import { readJsonFile } from './json-reader';
import { validateSchemaVersion } from './schema-version';

function validateEntryMetadataRequiredFields(
  md: Record<string, unknown>,
  context: string,
  issues: ValidationIssue[],
): void {
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
    if (typeof cost['estimatedCost'] !== 'number' || Number.isNaN(cost['estimatedCost'])) {
      issues.push(
        err('ERR_METADATA_INVALID', `${context}: estimateCost.estimatedCost must be a number`),
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
): void {
  if (!fs.existsSync(metaPath)) {
    return;
  }

  const { data: metaData, error: metaError } = readJsonFile(metaPath);
  if (metaError) {
    issues.push(err('ERR_METADATA_INVALID', metaError));
    return;
  }

  if (typeof metaData !== 'object' || metaData === null) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `${dirLabel}/${stem}.metadata.json: metadata must be a JSON object`,
      ),
    );
    return;
  }

  const md = metaData as Record<string, unknown>;
  const family: SchemaFamily = dirLabel === 'agents' ? 'metadata.agent' : 'metadata.flow';
  validateSchemaVersion(issues, {
    family,
    value: md['schemaVersion'],
    context: `${dirLabel}/${stem}.metadata.json`,
    errorCode: 'ERR_METADATA_INVALID',
  });

  validateEntryMetadataRequiredFields(md, `${dirLabel}/${stem}.metadata.json`, issues);
}

function validateFrontmatter(
  mdPath: string,
  dirLabel: 'agents' | 'flows',
  mdFile: string,
  stem: string,
  issues: ValidationIssue[],
): string {
  const content = fs.readFileSync(mdPath, 'utf-8');
  const frontmatter = parseFrontmatter(content);

  if (!frontmatter['name'] || frontmatter['name'] !== stem) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `${dirLabel}/${mdFile}: frontmatter name "${frontmatter['name']}" must equal stem "${stem}"`,
      ),
    );
  }

  if (!frontmatter['version'] || !ValidationUtils.isReleaseVersion(frontmatter['version'])) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `${dirLabel}/${mdFile}: frontmatter version must be a MAJOR.MINOR.PATCH release version, got: ${JSON.stringify(frontmatter['version'])}`,
      ),
    );
  }

  if (frontmatter['license'] && frontmatter['license'] !== 'MIT') {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `${dirLabel}/${mdFile}: frontmatter license must be "MIT", got: ${JSON.stringify(frontmatter['license'])}`,
      ),
    );
  }

  if (frontmatter['description'] && frontmatter['description'].length > 300) {
    issues.push(warn(`${dirLabel}/${mdFile}: frontmatter description exceeds 300 characters`));
  }

  return frontmatter['version'] ?? '';
}

function validateSingleEntryFile(
  entryDir: string,
  dirLabel: 'agents' | 'flows',
  mdFile: string,
  issues: ValidationIssue[],
): EntryVersion {
  const stem = mdFile.replace(/\.agent\.md$/, '');
  const mdPath = path.join(entryDir, mdFile);
  const metaPath = path.join(entryDir, `${stem}.metadata.json`);

  if (!fs.existsSync(metaPath)) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `${dirLabel}/${stem}.metadata.json is missing (required for ${mdFile})`,
      ),
    );
  }

  validateMetadataSidecar(metaPath, dirLabel, stem, issues);
  const frontmatterVersion = validateFrontmatter(mdPath, dirLabel, mdFile, stem, issues);
  return { id: stem, frontmatterVersion };
}

function warnUnmatchedMetadataFiles(
  files: string[],
  agentMdFiles: string[],
  dirLabel: 'agents' | 'flows',
  issues: ValidationIssue[],
): void {
  const metaFiles = files.filter(
    (fileName) => fileName.endsWith('.metadata.json') && !fileName.startsWith('.'),
  );

  for (const metaFile of metaFiles) {
    const stem = metaFile.replace(/\.metadata\.json$/, '');
    if (!agentMdFiles.includes(`${stem}.agent.md`)) {
      issues.push(warn(`${dirLabel}/${metaFile}: found .metadata.json with no matching .agent.md`));
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
  const agentMdFiles = files.filter((fileName) => fileName.endsWith('.agent.md'));

  for (const mdFile of agentMdFiles) {
    entries.push(validateSingleEntryFile(entryDir, dirLabel, mdFile, issues));
  }

  warnUnmatchedMetadataFiles(files, agentMdFiles, dirLabel, issues);

  return entries;
}
