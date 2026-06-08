import { describe, expect, it } from 'vitest';
import type { Manifest, PackageMetadata, ValidationIssue } from '../../../../../../scripts/lib/types';
import { validateCompatibilityManifestAlignment } from '../../../../../../scripts/lib/validators/package/compatibility-consistency';

function makeMetadata(): PackageMetadata {
  return {
    schemaVersion: '1.0.0',
    name: 'hello-agent',
    description: 'Test package',
    owner: 'agents-repo',
    license: 'MIT',
    homepage: 'https://github.com/agents-repo/registry',
    repository: 'https://github.com/agents-repo/registry',
    tags: ['test'],
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T00:00:00.000Z',
    version: '1.0.0',
    status: 'active',
    category: 'assistant',
    estimateOverallCost: { band: 'low' },
    compatibility: {
      targets: [
        { id: 'github-copilot', status: 'supported' },
        { id: 'cursor', status: 'supported' },
      ],
    },
  };
}

function makeManifest(artifacts: Manifest['versions'][number]['artifacts']): Manifest {
  return {
    schemaVersion: '1.1.0',
    name: 'hello-agent',
    latest: '1.0.0',
    versions: [
      {
        version: '1.0.0',
        artifacts,
        srcArtifact: '1.0.0-src.zip',
        srcSha256: 'a'.repeat(64),
        createdAt: '2026-05-22T00:00:00.000Z',
      },
    ],
  };
}

describe('validateCompatibilityManifestAlignment', (): void => {
  it('accepts aligned compatibility and manifest artifacts', (): void => {
    const issues: ValidationIssue[] = [];

    validateCompatibilityManifestAlignment(
      makeMetadata(),
      makeManifest([
        { target: 'github-copilot', file: '1.0.0-github-copilot.zip', sha256: 'a'.repeat(64) },
        { target: 'cursor', file: '1.0.0-cursor.zip', sha256: 'b'.repeat(64) },
      ]),
      issues,
    );

    expect(issues).toHaveLength(0);
  });

  it('flags missing declared targets in manifest artifacts', (): void => {
    const issues: ValidationIssue[] = [];

    validateCompatibilityManifestAlignment(
      makeMetadata(),
      makeManifest([
        { target: 'github-copilot', file: '1.0.0-github-copilot.zip', sha256: 'a'.repeat(64) },
      ]),
      issues,
    );

    expect(issues.some((issue) => issue.message.includes('missing artifact for declared install target "cursor"'))).toBe(
      true,
    );
  });

  it('flags manifest artifacts not declared in compatibility', (): void => {
    const issues: ValidationIssue[] = [];

    validateCompatibilityManifestAlignment(
      makeMetadata(),
      makeManifest([
        { target: 'github-copilot', file: '1.0.0-github-copilot.zip', sha256: 'a'.repeat(64) },
        { target: 'cursor', file: '1.0.0-cursor.zip', sha256: 'b'.repeat(64) },
        { target: 'claude-code', file: '1.0.0-claude-code.zip', sha256: 'c'.repeat(64) },
      ]),
      issues,
    );

    expect(
      issues.some((issue) => issue.message.includes('artifact target "claude-code" is not declared in metadata.json compatibility')),
    ).toBe(true);
  });
});
