import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { updateManifestAndIndexWithRollback } from '../../../../../scripts/lib/build/registry-sync';
import { INDEX_FILENAME, MANIFEST_FILENAME, VERSIONS_DIR } from '../../../../../scripts/lib/constants';
import { readJsonFile } from '../../../../../scripts/lib/io/json';
import type { BuiltTargetArtifact } from '../../../../../scripts/lib/emitters/target-zip-builder';
import type { Manifest, ManifestArtifactEntry, PackageIndex, PackageMetadata } from '../../../../../scripts/lib/types';

const createdDirs: string[] = [];

function makeTempPackageTree(): { packageDir: string; packagesDir: string; indexPath: string } {
  const packagesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-sync-test-'));
  createdDirs.push(packagesDir);
  const packageDir = path.join(packagesDir, 'agents-repo', 'demo');
  fs.mkdirSync(path.join(packageDir, VERSIONS_DIR), { recursive: true });
  const indexPath = path.join(packagesDir, INDEX_FILENAME);
  return { packageDir, packagesDir, indexPath };
}

function writeManifest(packageDir: string, manifest: Manifest): void {
  const manifestPath = path.join(packageDir, VERSIONS_DIR, MANIFEST_FILENAME);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

function baseMetadata(): PackageMetadata {
  return {
    schemaVersion: '1.0.0',
    name: 'demo',
    description: 'Demo package for registry-sync tests.',
    owner: 'agents-repo',
    license: 'MIT',
    homepage: 'https://github.com/agents-repo/registry',
    repository: 'https://github.com/agents-repo/registry',
    tags: ['demo'],
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T00:00:00.000Z',
    version: '1.0.0',
    status: 'active',
    category: 'assistant',
    estimateOverallCost: { band: 'low' },
    compatibility: {
      targets: [{ id: 'cursor', status: 'supported' }],
      consumption: [{ id: 'chat-web', status: 'supported' }],
    },
  };
}

const defaultManifestArtifacts: ManifestArtifactEntry[] = [
  { target: 'cursor', file: '1.0.0-cursor.zip', sha256: 'a'.repeat(64) },
];

function builtArtifacts(packageDir: string): BuiltTargetArtifact[] {
  return [
    {
      target: 'cursor',
      file: '1.0.0-cursor.zip',
      sha256: 'a'.repeat(64),
      absoluteFilePath: path.join(packageDir, '1.0.0-cursor.zip'),
    },
  ];
}

afterEach((): void => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('updateManifestAndIndexWithRollback', (): void => {
  it('projects index chatWeb from latest manifest version, not the version being built', (): void => {
    const { packageDir, packagesDir, indexPath } = makeTempPackageTree();
    const manifestPath = path.join(packageDir, VERSIONS_DIR, MANIFEST_FILENAME);

    writeManifest(packageDir, {
      schemaVersion: '1.0.0',
      name: 'demo',
      latest: '2.0.0',
      versions: [
        {
          version: '1.0.0',
          srcArtifact: '1.0.0-src.zip',
          srcSha256: 'c'.repeat(64),
          artifacts: defaultManifestArtifacts,
          createdAt: '2026-05-22T00:00:00.000Z',
        },
        {
          version: '2.0.0',
          srcArtifact: '2.0.0-src.zip',
          srcSha256: 'd'.repeat(64),
          artifacts: [{ target: 'cursor', file: '2.0.0-cursor.zip', sha256: 'e'.repeat(64) }],
          createdAt: '2026-05-22T00:00:00.000Z',
          instructionsArtifact: 'instructions.json',
          instructionsSha256: 'f'.repeat(64),
        },
      ],
    });

    updateManifestAndIndexWithRollback({
      ref: { namespace: 'agents-repo', packageId: 'demo', qualifiedId: 'agents-repo/demo' },
      manifestPath,
      indexPath,
      packagesDir,
      metadata: baseMetadata(),
      version: '1.0.0',
      artifacts: builtArtifacts(packageDir),
      srcZipSha256: 'b'.repeat(64),
    });

    const index = readJsonFile<PackageIndex>(indexPath);
    const entry = index.packages.find((pkg) => pkg.id === 'agents-repo/demo');
    expect(entry?.latest).toBe('2.0.0');
    expect(entry?.chatWeb).toBe(true);
  });
});
