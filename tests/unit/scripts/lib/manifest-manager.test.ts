import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Manifest } from '../../../../scripts/lib/types';
import { ManifestManager } from '../../../../scripts/lib/manifest-manager';

const createdDirs: string[] = [];
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);
const HASH_D = 'd'.repeat(64);

function makeTempDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-manifest-test-'));
  createdDirs.push(tempDir);
  return tempDir;
}

function makeManifest(): Manifest {
  return {
    schemaVersion: '1.1.0',
    name: 'hello-agent',
    latest: '1.0.0',
    versions: [
      {
        version: '1.0.0',
        srcArtifact: '1.0.0-src.zip',
        srcSha256: HASH_B,
        artifacts: [
          {
            target: 'github-copilot',
            file: '1.0.0-github-copilot.zip',
            sha256: HASH_A,
          },
        ],
        createdAt: '2026-05-22T00:00:00.000Z',
      },
    ],
  };
}

afterEach((): void => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('ManifestManager', (): void => {
  it('upserts versions and keeps semver sorting/latest pointer', (): void => {
    const tempDir = makeTempDir();
    const manager = new ManifestManager(path.join(tempDir, 'manifest.json'), 'hello-agent');

    const updated = manager.upsert(makeManifest(), {
      version: '1.1.0',
      srcArtifact: '1.1.0-src.zip',
      srcSha256: HASH_D,
      artifacts: [
        {
          target: 'github-copilot',
          file: '1.1.0-github-copilot.zip',
          sha256: HASH_C,
        },
      ],
      createdAt: '2026-05-22T00:00:01.000Z',
    });

    expect(updated.versions.map((entry) => entry.version)).toEqual(['1.0.0', '1.1.0']);
    expect(updated.latest).toBe('1.1.0');
  });

  it('throws when upsert receives non-release version', (): void => {
    const tempDir = makeTempDir();
    const manager = new ManifestManager(path.join(tempDir, 'manifest.json'), 'hello-agent');

    expect(() => {
      manager.upsert(makeManifest(), {
        version: '1.1.0-beta.1',
        srcArtifact: '1.1.0-beta.1-src.zip',
        srcSha256: HASH_D,
        artifacts: [
          {
            target: 'github-copilot',
            file: '1.1.0-beta.1-github-copilot.zip',
            sha256: HASH_C,
          },
        ],
        createdAt: '2026-05-22T00:00:01.000Z',
      });
    }).toThrow('manifest entry version must be a MAJOR.MINOR.PATCH release version');
  });
});
