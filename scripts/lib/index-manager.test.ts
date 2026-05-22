import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { PackageIndex, PackageMetadata } from './types';
import { IndexManager } from './index-manager';

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

    manager.update('zeta-package', makeMetadata({ name: 'zeta-package' }), '1.0.0');
    manager.update('alpha-package', makeMetadata({ name: 'alpha-package' }), '1.0.0');

    const index = readIndex(indexPath);
    expect(index.packages.map((pkg) => pkg.id)).toEqual(['alpha-package', 'zeta-package']);
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
      manager.update('hello-agent', metadata, '1.0.0');
    }).toThrow('estimateOverallCost.band');
  });
});