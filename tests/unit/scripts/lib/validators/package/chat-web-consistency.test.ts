import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateChatWebIncludedRequiresSupportedChannel } from '../../../../../../scripts/lib/validators/package/chat-web-consistency';
import type { PackageMetadata, ValidationIssue } from '../../../../../../scripts/lib/types';

const createdDirs: string[] = [];

afterEach((): void => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('validateChatWebIncludedRequiresSupportedChannel', (): void => {
  it('errors when child chatWeb is included without supported package channel', (): void => {
    const packageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-web-val-'));
    createdDirs.push(packageDir);
    const agentsDir = path.join(packageDir, 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentsDir, 'alpha.metadata.json'),
      JSON.stringify({
        schemaVersion: '1.0.0',
        name: 'alpha',
        description: 'Alpha agent',
        license: 'MIT',
        status: 'active',
        category: 'assistant',
        estimateCost: { estimatedCost: 2, band: 'minimal' },
        chatWeb: 'included',
      }),
      'utf-8',
    );

    const metadata = {
      schemaVersion: '1.0.0',
      name: 'pkg',
      description: 'Package',
      owner: 'agents-repo',
      license: 'MIT',
      homepage: 'https://example.com',
      repository: 'https://example.com',
      tags: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      version: '1.0.0',
      status: 'active',
      category: 'assistant',
      estimateOverallCost: { band: 'low' },
      compatibility: {
        targets: [{ id: 'cursor', status: 'supported' }],
      },
    } as PackageMetadata;

    const issues: ValidationIssue[] = [];
    validateChatWebIncludedRequiresSupportedChannel(packageDir, metadata, issues);
    expect(issues.some((issue) => issue.message.includes('chatWeb "included"'))).toBe(true);
  });
});
