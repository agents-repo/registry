import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DETAIL_FILENAME, README_FILENAME, VERSIONS_DIR } from '../../../../scripts/lib/constants';
import {
  buildPackageDetailDocument,
  writePackageDetailJson,
} from '../../../../scripts/lib/package-detail-builder';
import type { Manifest, PackageMetadata, PackageRef } from '../../../../scripts/lib/types';

const createdDirs: string[] = [];

function makeTempPackageDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-package-detail-'));
  createdDirs.push(dir);
  return dir;
}

function makeRef(): PackageRef {
  return { namespace: 'agents-repo', packageId: 'demo', qualifiedId: 'agents-repo/demo' };
}

function makeMetadata(): PackageMetadata {
  return {
    schemaVersion: '1.0.0',
    name: 'demo',
    description: 'Demo package for detail.json tests.',
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
}

function makeManifest(): Manifest {
  return {
    schemaVersion: '1.2.0',
    name: 'demo',
    latest: '1.0.1',
    versions: [
      {
        version: '1.0.0',
        srcArtifact: '1.0.0-src.zip',
        srcSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        artifacts: [{ target: 'cursor', file: '1.0.0-cursor.zip', sha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }],
        createdAt: '2026-05-22T00:00:00.000Z',
      },
      {
        version: '1.0.1',
        srcArtifact: '1.0.1-src.zip',
        srcSha256: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        artifacts: [{ target: 'cursor', file: '1.0.1-cursor.zip', sha256: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd' }],
        createdAt: '2026-06-01T00:00:00.000Z',
        instructionsArtifact: 'instructions.json',
        instructionsSha256: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      },
    ],
  };
}

function writeSidecar(
  dir: string,
  id: string,
  kind: 'agent' | 'flow',
  extras?: { agents?: string[] },
): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.agent.md`), `# ${id}\n`, 'utf-8');
  const meta: Record<string, unknown> = {
    schemaVersion: '1.0.0',
    name: id,
    description: `${kind} ${id} for tests.`,
    license: 'MIT',
    status: 'active',
    category: 'assistant',
    estimateCost: { estimatedCost: 2, band: 'low' },
  };
  if (extras?.agents !== undefined) {
    meta['agents'] = extras.agents;
  }
  fs.writeFileSync(path.join(dir, `${id}.metadata.json`), `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');
}

function writeLatestSnapshot(packageDir: string, includeReadme: boolean): void {
  const snapshotDir = path.join(packageDir, VERSIONS_DIR, '1.0.1');
  fs.mkdirSync(snapshotDir, { recursive: true });
  fs.writeFileSync(
    path.join(snapshotDir, 'metadata.json'),
    `${JSON.stringify(makeMetadata(), null, 2)}\n`,
    'utf-8',
  );
  if (includeReadme) {
    fs.writeFileSync(path.join(snapshotDir, README_FILENAME), '# demo\n\nLatest snapshot README.\n', 'utf-8');
  }
  writeSidecar(path.join(snapshotDir, 'agents'), 'planner', 'agent');
  writeSidecar(path.join(snapshotDir, 'flows'), 'triage', 'flow', { agents: ['planner'] });
}

afterEach((): void => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('buildPackageDetailDocument', (): void => {
  it('builds latest-snapshot detail without embedding agent bodies or checksums', (): void => {
    const packageDir = makeTempPackageDir();
    writeLatestSnapshot(packageDir, true);

    const document = buildPackageDetailDocument(makeRef(), packageDir, '1.0.1', makeManifest());

    expect(document.schemaVersion).toBe('1.0.0');
    expect(document.package).toBe('agents-repo/demo');
    expect(document.version).toBe('1.0.1');
    expect(document.readmeMarkdown).toBe('# demo\n\nLatest snapshot README.\n');
    expect(document.agents).toEqual([
      {
        id: 'planner',
        name: 'planner',
        description: 'agent planner for tests.',
        status: 'active',
        category: 'assistant',
        estimateCost: { estimatedCost: 2, band: 'low' },
        instructionPath: 'packages/agents-repo/demo/versions/1.0.1/agents/planner.agent.md',
      },
    ]);
    expect(document.flows[0]?.agents).toEqual(['planner']);
    expect(document.flows[0]?.instructionPath).toBe(
      'packages/agents-repo/demo/versions/1.0.1/flows/triage.agent.md',
    );
    expect(document.chatWeb).toBe(true);
    expect(document.instructionsPath).toBe('/pkg/agents-repo/demo/1.0.1/instructions.json');
    expect(document.versions.latest).toBe('1.0.1');
    expect(document.versions.entries[1]).toEqual({
      version: '1.0.1',
      createdAt: '2026-06-01T00:00:00.000Z',
      srcArtifact: '1.0.1-src.zip',
      artifacts: [{ target: 'cursor', file: '1.0.1-cursor.zip' }],
      instructionsArtifact: 'instructions.json',
    });
    expect(JSON.stringify(document)).not.toContain('sha256');
    expect(JSON.stringify(document)).not.toContain('# planner');
  });

  it('omits readmeMarkdown when the latest snapshot has no README', (): void => {
    const packageDir = makeTempPackageDir();
    writeLatestSnapshot(packageDir, false);

    const document = buildPackageDetailDocument(makeRef(), packageDir, '1.0.1', makeManifest());

    expect(document.readmeMarkdown).toBeUndefined();
  });

  it('omits chatWeb unless the latest manifest entry has an instructions artifact', (): void => {
    const packageDir = makeTempPackageDir();
    writeLatestSnapshot(packageDir, false);
    const manifest = makeManifest();
    manifest.versions = manifest.versions.map((entry, index) => {
      if (index !== 1) {
        return entry;
      }

      return {
        version: entry.version,
        srcArtifact: entry.srcArtifact,
        srcSha256: entry.srcSha256,
        artifacts: entry.artifacts,
        createdAt: entry.createdAt,
      };
    });

    const document = buildPackageDetailDocument(makeRef(), packageDir, '1.0.1', manifest);

    expect(document.chatWeb).toBeUndefined();
    expect(document.instructionsPath).toBeUndefined();
  });
});

describe('writePackageDetailJson', (): void => {
  it('writes detail.json at the package root', (): void => {
    const packageDir = makeTempPackageDir();
    writeLatestSnapshot(packageDir, true);

    const detailPath = writePackageDetailJson(makeRef(), packageDir, '1.0.1', makeManifest());

    expect(detailPath).toBe(path.join(packageDir, DETAIL_FILENAME));
    expect(fs.existsSync(detailPath)).toBe(true);
  });
});
