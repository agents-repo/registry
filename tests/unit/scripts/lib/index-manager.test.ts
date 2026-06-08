import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { INSTALL_TARGET_IDS, SCHEMA_FAMILY_INDEX } from '../../../../scripts/lib/constants';
import { getSchemaCurrentVersion } from '../../../../scripts/lib/schema-versions';
import type { ManifestArtifactEntry, PackageIndex, PackageMetadata } from '../../../../scripts/lib/types';
import { IndexManager } from '../../../../scripts/lib/index-manager';

const DEFAULT_ARTIFACTS: ManifestArtifactEntry[] = [
  { target: 'github-copilot', file: '1.0.0-github-copilot.zip', sha256: 'a'.repeat(64) },
  { target: 'claude-code', file: '1.0.0-claude-code.zip', sha256: 'b'.repeat(64) },
  { target: 'cursor', file: '1.0.0-cursor.zip', sha256: 'c'.repeat(64) },
  { target: 'openai-codex', file: '1.0.0-openai-codex.zip', sha256: 'd'.repeat(64) },
];

const createdDirs: string[] = [];

function makeTempDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-index-test-'));
  createdDirs.push(tempDir);
  return tempDir;
}

function makeMetadata(overrides?: Partial<PackageMetadata>): PackageMetadata {
  return {
    schemaVersion: '1.0.0',
    name: 'hello-agent',
    description: 'desc',
    owner: 'agents-repo',
    license: 'MIT',
    homepage: 'https://github.com/agents-repo/registry',
    repository: 'https://github.com/agents-repo/registry',
    tags: ['agent'],
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T00:00:00.000Z',
    version: '1.0.0',
    status: 'active',
    category: 'assistant',
    estimateOverallCost: {
      band: 'low',
      estimatedCost: 2,
    },
    ...overrides,
  };
}

function readIndex(indexPath: string): PackageIndex {
  return JSON.parse(fs.readFileSync(indexPath, 'utf-8')) as PackageIndex;
}

afterEach((): void => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('IndexManager', (): void => {
  it('writes and sorts package entries by id', (): void => {
    const tempDir = makeTempDir();
    const indexPath = path.join(tempDir, 'index.json');
    const manager = new IndexManager(indexPath);

    manager.update('zeta-package', makeMetadata({ name: 'zeta-package' }), '1.0.0', DEFAULT_ARTIFACTS);
    manager.update('alpha-package', makeMetadata({ name: 'alpha-package' }), '1.0.0', DEFAULT_ARTIFACTS);

    const index = readIndex(indexPath);
    expect(index.packages.map((pkg) => pkg.id)).toEqual(['alpha-package', 'zeta-package']);
    expect(index.packages[0].owner).toBe('agents-repo');
    expect(index.schemaVersion).toBe(getSchemaCurrentVersion(SCHEMA_FAMILY_INDEX));
  });

  it('normalizes an existing index schemaVersion to current on update', (): void => {
    const tempDir = makeTempDir();
    const indexPath = path.join(tempDir, 'index.json');
    const manager = new IndexManager(indexPath);

    fs.writeFileSync(indexPath, JSON.stringify({ schemaVersion: '1.0.0', updatedAt: '', packages: [] }), 'utf-8');

    manager.update('hello-agent', makeMetadata(), '1.0.0', DEFAULT_ARTIFACTS);

    const index = readIndex(indexPath);
    expect(index.schemaVersion).toBe(getSchemaCurrentVersion(SCHEMA_FAMILY_INDEX));
  });

  it('throws when existing index has entries without owner', (): void => {
    const tempDir = makeTempDir();
    const indexPath = path.join(tempDir, 'index.json');
    const manager = new IndexManager(indexPath);

    fs.writeFileSync(
      indexPath,
      JSON.stringify({
        schemaVersion: '1.0.0',
        updatedAt: '',
        packages: [
          {
            id: 'legacy-package',
            name: 'legacy-package',
            description: 'legacy entry without owner',
            latest: '1.0.0',
            tags: ['agent'],
            status: 'active',
            category: 'assistant',
            estimateOverallCost: {
              band: 'low',
              estimatedCost: 2,
            },
          },
        ],
      }),
      'utf-8',
    );

    expect(() => {
      manager.update('hello-agent', makeMetadata(), '1.0.0', DEFAULT_ARTIFACTS);
    }).toThrow('package:index:rebuild');
  });

  it('writes installTargets projected from manifest artifacts', (): void => {
    const tempDir = makeTempDir();
    const indexPath = path.join(tempDir, 'index.json');
    const manager = new IndexManager(indexPath);

    manager.update('hello-agent', makeMetadata(), '1.0.0', DEFAULT_ARTIFACTS);

    const entry = readIndex(indexPath).packages.find((pkg) => pkg.id === 'hello-agent');
    expect(entry?.installTargets).toHaveLength(INSTALL_TARGET_IDS.length);
    expect(entry?.installTargets?.map((target) => target.id)).toEqual(
      expect.arrayContaining([...INSTALL_TARGET_IDS]),
    );
    expect(entry?.installTargets?.every((target) => target.status === 'supported')).toBe(true);
  });

  it('throws when estimateOverallCost.band is invalid', (): void => {
    const tempDir = makeTempDir();
    const indexPath = path.join(tempDir, 'index.json');
    const manager = new IndexManager(indexPath);

    const metadata = makeMetadata({
      estimateOverallCost: {
        band: 'invalid' as unknown as PackageMetadata['estimateOverallCost']['band'],
        estimatedCost: 2,
      },
    });

    expect(() => {
      manager.update('hello-agent', metadata, '1.0.0', DEFAULT_ARTIFACTS);
    }).toThrow('estimateOverallCost.band');
  });
});
