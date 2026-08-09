import { describe, expect, it } from 'vitest';
import { isChatWebEntryIncluded, isChatWebSupported, projectChatWebForIndex } from '../../../../scripts/lib/compatibility';
import type { ManifestVersionEntry, PackageMetadata } from '../../../../scripts/lib/types';

function baseMetadata(): PackageMetadata {
  return {
    schemaVersion: '1.0.0',
    name: 'demo',
    description: 'Demo',
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
      consumption: [{ id: 'chat-web', status: 'supported' }],
    },
  };
}

describe('chat-web compatibility', (): void => {
  it('detects supported channel', (): void => {
    expect(isChatWebSupported(baseMetadata())).toBe(true);
  });

  it('inherits included when child omits chatWeb', (): void => {
    expect(isChatWebEntryIncluded(baseMetadata(), undefined)).toBe(true);
  });

  it('projects chatWeb for index from manifest entry', (): void => {
    const entry: ManifestVersionEntry = {
      version: '1.0.0',
      srcArtifact: '1.0.0-src.zip',
      srcSha256: 'a'.repeat(64),
      artifacts: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      instructionsArtifact: 'instructions.json',
      instructionsSha256: 'b'.repeat(64),
    };
    expect(projectChatWebForIndex(baseMetadata(), entry)).toBe(true);
  });
});
