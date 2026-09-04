import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { afterEach, describe, expect, it } from 'vitest';
import { DETAIL_FILENAME, README_FILENAME, VERSIONS_DIR } from '../../../../scripts/lib/constants';
import { readJsonFile } from '../../../../scripts/lib/io/json';
import { backfillPackages } from '../../../../scripts/lib/readme-backfill-run';
import type { PackageDetailDocument } from '../../../../scripts/lib/package-detail-builder';
import type { Manifest, PackageMetadata } from '../../../../scripts/lib/types';

const createdDirs: string[] = [];

afterEach((): void => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

describe('backfillPackages', (): void => {
  it('regenerates latest detail.json after writing snapshot README files', (): void => {
    const packagesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-readme-backfill-run-'));
    createdDirs.push(packagesDir);
    const packageDir = path.join(packagesDir, 'agents-repo', 'demo');
    const snapshotDir = path.join(packageDir, VERSIONS_DIR, '1.0.1');
    fs.mkdirSync(path.join(snapshotDir, 'agents'), { recursive: true });

    const metadata: PackageMetadata = {
      schemaVersion: '1.0.0',
      name: 'demo',
      description: 'Demo package for README backfill.',
      owner: 'agents-repo',
      license: 'MIT',
      homepage: 'https://github.com/agents-repo/registry',
      repository: 'https://github.com/agents-repo/registry',
      tags: ['demo'],
      createdAt: '2026-05-22T00:00:00.000Z',
      updatedAt: '2026-05-22T00:00:00.000Z',
      version: '1.0.1',
      status: 'active',
      category: 'assistant',
      estimateOverallCost: { band: 'low' },
      compatibility: {
        targets: [{ id: 'cursor', status: 'supported' }],
        consumption: [{ id: 'chat-web', status: 'supported' }],
      },
    };
    const manifest: Manifest = {
      schemaVersion: '1.2.0',
      name: 'demo',
      latest: '1.0.1',
      versions: [
        {
          version: '1.0.1',
          srcArtifact: '1.0.1-src.zip',
          srcSha256: 'c'.repeat(64),
          artifacts: [{ target: 'cursor', file: '1.0.1-cursor.zip', sha256: 'd'.repeat(64) }],
          createdAt: '2026-06-01T00:00:00.000Z',
          instructionsArtifact: 'instructions.json',
          instructionsSha256: 'e'.repeat(64),
        },
      ],
    };

    writeJson(path.join(packageDir, 'metadata.json'), metadata);
    writeJson(path.join(packageDir, VERSIONS_DIR, 'manifest.json'), manifest);
    writeJson(path.join(snapshotDir, 'metadata.json'), metadata);
    writeJson(path.join(snapshotDir, 'agents', 'planner.metadata.json'), {
      schemaVersion: '1.0.0',
      name: 'planner',
      description: 'Planner agent.',
      license: 'MIT',
      status: 'active',
      category: 'assistant',
      estimateCost: { estimatedCost: 2, band: 'minimal' },
    });
    fs.writeFileSync(path.join(snapshotDir, 'agents', 'planner.agent.md'), '# planner\n', 'utf-8');

    const zip = new AdmZip();
    zip.addFile(README_FILENAME, Buffer.from('# from zip\n', 'utf-8'));
    zip.writeZip(path.join(snapshotDir, '1.0.1-src.zip'));

    const summary = backfillPackages(packagesDir);

    expect(summary.written).toBe(1);
    expect(summary.detailsWritten).toBe(1);
    expect(fs.readFileSync(path.join(snapshotDir, README_FILENAME), 'utf-8')).toBe('# from zip\n');
    const detail = readJsonFile<PackageDetailDocument>(path.join(packageDir, DETAIL_FILENAME));
    expect(detail.readmeMarkdown).toBe('# from zip\n');
  });
});
