import { describe, expect, it } from 'vitest';
import { PackageError } from '../../../../scripts/lib/errors';
import {
  parsePackageCompatibility,
  projectInstallTargetsForIndex,
  resolveDeclaredInstallTargets,
} from '../../../../scripts/lib/compatibility';
import { INSTALL_TARGET_IDS } from '../../../../scripts/lib/constants';
import type { ManifestArtifactEntry, PackageMetadata } from '../../../../scripts/lib/types';

function makeMetadata(overrides: Partial<PackageMetadata> = {}): PackageMetadata {
  return {
    schemaVersion: '1.0.0',
    name: 'test-package',
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
    ...overrides,
  };
}

const DEFAULT_ARTIFACTS: ManifestArtifactEntry[] = INSTALL_TARGET_IDS.map((target, index) => ({
  target,
  file: `1.0.0-${target}.zip`,
  sha256: String.fromCharCode(97 + index).repeat(64),
}));

describe('parsePackageCompatibility', (): void => {
  it('defaults to all supported targets when compatibility is omitted', (): void => {
    const compatibility = parsePackageCompatibility(makeMetadata());

    expect(compatibility.canonicalFormat).toBe('agents-repo.agent-instruction@1.0.0');
    expect(compatibility.targets).toHaveLength(4);
    expect(compatibility.targets.every((target) => target.status === 'supported')).toBe(true);
  });

  it('parses explicit compatibility targets', (): void => {
    const compatibility = parsePackageCompatibility(
      makeMetadata({
        compatibility: {
          canonicalFormat: 'custom.format@2.0.0',
          targets: [
            { id: 'cursor', status: 'experimental' },
            { id: 'github-copilot', status: 'supported' },
          ],
        },
      }),
    );

    expect(compatibility.canonicalFormat).toBe('custom.format@2.0.0');
    expect(compatibility.targets).toEqual([
      { id: 'cursor', status: 'experimental' },
      { id: 'github-copilot', status: 'supported' },
    ]);
  });
});

describe('resolveDeclaredInstallTargets', (): void => {
  it('excludes planned targets from build declarations', (): void => {
    const targets = resolveDeclaredInstallTargets(
      makeMetadata({
        compatibility: {
          targets: [
            { id: 'cursor', status: 'planned' },
            { id: 'github-copilot', status: 'supported' },
          ],
        },
      }),
    );

    expect(targets).toEqual([{ id: 'github-copilot', status: 'supported' }]);
  });
});

describe('projectInstallTargetsForIndex', (): void => {
  it('projects supported and experimental targets with built artifacts', (): void => {
    const projected = projectInstallTargetsForIndex(makeMetadata(), DEFAULT_ARTIFACTS);

    expect(projected).toHaveLength(4);
    expect(projected.every((entry) => entry.status === 'supported')).toBe(true);
  });

  it('omits planned targets from the index projection', (): void => {
    const projected = projectInstallTargetsForIndex(
      makeMetadata({
        compatibility: {
          targets: [
            { id: 'github-copilot', status: 'supported' },
            { id: 'cursor', status: 'planned' },
            { id: 'claude-code', status: 'supported' },
            { id: 'openai-codex', status: 'supported' },
          ],
        },
      }),
      DEFAULT_ARTIFACTS,
    );

    expect(projected.map((entry) => entry.id)).toEqual([
      'github-copilot',
      'claude-code',
      'openai-codex',
    ]);
  });

  it('throws when a declared target is missing from manifest artifacts', (): void => {
    expect(() =>
      projectInstallTargetsForIndex(
        makeMetadata(),
        DEFAULT_ARTIFACTS.filter((artifact) => artifact.target !== 'cursor'),
      ),
    ).toThrow(PackageError);
  });
});
