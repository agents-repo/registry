import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../../frontmatter';
import { ValidationUtils } from '../../validation-utils';
import type { SchemaFamily } from '../../schema-versions';
import type { ValidationIssue } from '../../types';
import { err, warn } from '../common/issues';
import { readJsonFile } from './json-reader';
import { validateSchemaVersion } from './schema-version';

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

    if (fs.existsSync(metaPath)) {
      const { data: metaData, error: metaError } = readJsonFile(metaPath);
      if (metaError) {
        issues.push(err('ERR_METADATA_INVALID', metaError));
      } else if (typeof metaData === 'object' && metaData !== null) {
        const md = metaData as Record<string, unknown>;
        const family: SchemaFamily = dirLabel === 'agents' ? 'metadata.agent' : 'metadata.flow';
        validateSchemaVersion(issues, {
          family,
          value: md['schemaVersion'],
          context: `${dirLabel}/${stem}.metadata.json`,
          errorCode: 'ERR_METADATA_INVALID',
        });
      }
    }

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

    entries.push({ id: stem, frontmatterVersion: frontmatter['version'] ?? '' });
  }

  const metaFiles = files.filter(
    (fileName) => fileName.endsWith('.metadata.json') && !fileName.startsWith('.'),
  );

  for (const metaFile of metaFiles) {
    const stem = metaFile.replace(/\.metadata\.json$/, '');
    if (!agentMdFiles.includes(`${stem}.agent.md`)) {
      issues.push(warn(`${dirLabel}/${metaFile}: found .metadata.json with no matching .agent.md`));
    }
  }

  return entries;
}
