import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ValidationIssue } from '../../../../../../scripts/lib/types';
import {
  validateHasEntries,
  validateUniqueIdsAcrossEntryTypes,
  type EntryVersion,
} from '../../../../../../scripts/lib/validators/package/entries';
import {
  validateMetadataVersionAgainstManifestLatest,
  validateSharedFrontmatterVersion,
  validateFrontmatterVersionMatchesMetadata,
} from '../../../../../../scripts/lib/validators/package/version-consistency';

const createdDirs: string[] = [];

function makeTempDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-version-test-'));
  createdDirs.push(tempDir);
  return tempDir;
}

function createEntry(id: string, frontmatterVersion: string): EntryVersion {
  return { id, frontmatterVersion };
}

afterEach((): void => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('entries + version consistency validators', (): void => {
  it('rejects packages without agents or flows', (): void => {
    const issues: ValidationIssue[] = [];

    validateHasEntries([], [], issues);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('ERR_VALIDATION_FAILED');
  });

  it('rejects duplicate ids across agents and flows', (): void => {
    const issues: ValidationIssue[] = [];

    validateUniqueIdsAcrossEntryTypes(
      [createEntry('shared-id', '1.0.0')],
      [createEntry('shared-id', '1.0.0')],
      issues,
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message.includes('used in both agents/ and flows/')).toBe(true);
  });

  it('returns undefined when frontmatter versions diverge', (): void => {
    const issues: ValidationIssue[] = [];

    const sharedVersion = validateSharedFrontmatterVersion(
      [createEntry('one', '1.0.0'), createEntry('two', '2.0.0')],
      issues,
    );

    expect(sharedVersion).toBeUndefined();
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('ERR_VALIDATION_FAILED');
  });

  it('flags metadata version lower than manifest latest', (): void => {
    const tempDir = makeTempDir();
    const versionsDir = path.join(tempDir, 'versions');
    fs.mkdirSync(versionsDir, { recursive: true });

    fs.writeFileSync(
      path.join(versionsDir, 'manifest.json'),
      JSON.stringify({ latest: '1.2.0', versions: [] }),
      'utf-8',
    );

    const issues: ValidationIssue[] = [];
    validateMetadataVersionAgainstManifestLatest(
      tempDir,
      { version: '1.1.0' },
      issues,
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message.includes('must be >= manifest.json latest')).toBe(true);
  });

  it('flags frontmatter version mismatching metadata.json version', (): void => {
    const tempDir = makeTempDir();
    fs.writeFileSync(
      path.join(tempDir, 'metadata.json'),
      JSON.stringify({ version: '1.0.0' }),
      'utf-8',
    );

    const issues: ValidationIssue[] = [];
    validateFrontmatterVersionMatchesMetadata(tempDir, '2.0.0', issues);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message.includes('does not match metadata.json version')).toBe(true);
  });
});
