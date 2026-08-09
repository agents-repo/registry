import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildInstructionsManifest,
} from '../../../../scripts/lib/instructions-manifest-builder';
import type { PackageMetadata, PackageRef } from '../../../../scripts/lib/types';

const createdDirs: string[] = [];

function makeTempPackageDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-instructions-test-'));
  createdDirs.push(dir);
  return dir;
}

function makeRef(): PackageRef {
  return { namespace: 'agents-repo', packageId: 'demo', qualifiedId: 'agents-repo/demo' };
}

function makeMetadata(overrides?: Partial<PackageMetadata>): PackageMetadata {
  return {
    schemaVersion: '1.0.0',
    name: 'demo',
    description: 'Demo package for chat-web tests.',
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
    ...overrides,
  };
}

function writeAgent(packageDir: string, id: string, chatWeb?: string): void {
  const agentsDir = path.join(packageDir, 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });
  const body = `---
name: ${id}
version: 1.0.0
description: Agent ${id} for tests.
license: MIT
---

# ${id}
`;
  fs.writeFileSync(path.join(agentsDir, `${id}.agent.md`), body, 'utf-8');
  const meta: Record<string, unknown> = {
    schemaVersion: '1.0.0',
    name: id,
    description: `Agent ${id} for tests.`,
    license: 'MIT',
    status: 'active',
    category: 'assistant',
    estimateCost: { estimatedCost: 2, band: 'low' },
  };
  if (chatWeb !== undefined) {
    meta['chatWeb'] = chatWeb;
  }
  fs.writeFileSync(path.join(agentsDir, `${id}.metadata.json`), JSON.stringify(meta), 'utf-8');
}

afterEach((): void => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('buildInstructionsManifest', (): void => {
  it('returns null when chat-web is not supported', (): void => {
    const packageDir = makeTempPackageDir();
    writeAgent(packageDir, 'alpha');
    const result = buildInstructionsManifest(
      makeRef(),
      packageDir,
      makeMetadata({ compatibility: { targets: [{ id: 'cursor', status: 'supported' }] } }),
      '1.0.0',
    );
    expect(result).toBeNull();
  });

  it('builds path-only instructions without https origin', (): void => {
    const packageDir = makeTempPackageDir();
    writeAgent(packageDir, 'planner');
    const result = buildInstructionsManifest(makeRef(), packageDir, makeMetadata(), '1.0.0');
    expect(result).not.toBeNull();
    expect(result?.manifest.instructions).toHaveLength(1);
    expect(result?.manifest.instructions[0].path).toBe(
      '/pkg/agents-repo/demo/1.0.0/agents/planner.agent.md',
    );
    expect(result?.manifest.instructions[0].path).not.toContain('https://');
  });

  it('omits excluded agents', (): void => {
    const packageDir = makeTempPackageDir();
    writeAgent(packageDir, 'keep');
    writeAgent(packageDir, 'skip', 'excluded');
    const result = buildInstructionsManifest(makeRef(), packageDir, makeMetadata(), '1.0.0');
    expect(result?.manifest.instructions.map((entry) => entry.id)).toEqual(['keep']);
  });
});
