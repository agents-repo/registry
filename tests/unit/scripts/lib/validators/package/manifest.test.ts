import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ValidationIssue } from '../../../../../../scripts/lib/types';
import { validateManifest } from '../../../../../../scripts/lib/validators/package/manifest';

const createdDirs: string[] = [];
const HASH = 'a'.repeat(64);

function makeTempDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-manifest-validator-'));
  createdDirs.push(tempDir);
  return tempDir;
}

afterEach((): void => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('validateManifest pathEncoding schema gate', (): void => {
  it('rejects pathEncoding on manifest schemaVersion 1.1.0', (): void => {
    const tempDir = makeTempDir();
    const manifestPath = path.join(tempDir, 'manifest.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          schemaVersion: '1.1.0',
          name: 'hello-agent',
          latest: '1.0.0',
          versions: [
            {
              version: '1.0.0',
              srcArtifact: '1.0.0-src.zip',
              srcSha256: HASH,
              artifacts: [
                {
                  target: 'cursor',
                  file: '1.0.0-cursor.zip',
                  sha256: HASH,
                  pathEncoding: 1,
                },
              ],
              createdAt: '2026-05-22T00:00:00.000Z',
            },
          ],
        },
        null,
        2,
      ),
    );

    const issues: ValidationIssue[] = [];
    validateManifest(manifestPath, 'hello-agent', issues);

    expect(
      issues.some(
        (issue) =>
          issue.code === 'ERR_VALIDATION_FAILED' &&
          issue.message.includes('pathEncoding requires manifest.json schemaVersion 1.2.0'),
      ),
    ).toBe(true);
  });
});
