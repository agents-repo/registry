import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Manifest } from './types';
import { ManifestManager } from './manifest-manager';

const createdDirs: string[] = [];

function makeTempDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-manifest-test-'));
  createdDirs.push(tempDir);
  return tempDir;
}

function makeManifest(): Manifest {
  return {
    schemaVersion: '1.0.0',
    name: 'hello-agent',
    latest: '1.0.0',
    versions: [
      {
        version: '1.0.0',
        artifact: '1.0.0.zip',
        sha256: 'a',
        srcArtifact: '1.0.0-src.zip',
        srcSha256: 'b',
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
      artifact: '1.1.0.zip',
      sha256: 'c',
      srcArtifact: '1.1.0-src.zip',
      srcSha256: 'd',
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
        artifact: '1.1.0-beta.1.zip',
        sha256: 'c',
        srcArtifact: '1.1.0-beta.1-src.zip',
        srcSha256: 'd',
        createdAt: '2026-05-22T00:00:01.000Z',
      });
    }).toThrow('manifest entry version must be a MAJOR.MINOR.PATCH release version');
  });
});