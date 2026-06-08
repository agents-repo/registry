import { describe, expect, it } from 'vitest';
import type { ValidationIssue } from '../../../../../../scripts/lib/types';
import { validateMetadata } from '../../../../../../scripts/lib/validators/package/metadata';

function makeBaseMetadata(): Record<string, unknown> {
  return {
    schemaVersion: '1.0.0',
    name: 'hello-agent',
    description: 'Valid package metadata',
    owner: 'agents-repo',
    license: 'MIT',
    homepage: 'https://github.com/agents-repo/registry',
    repository: 'https://github.com/agents-repo/registry',
    tags: ['agent', 'validation'],
    createdAt: '2026-05-22T00:00:00.000Z',
    updatedAt: '2026-05-22T00:00:00.000Z',
    version: '1.0.0',
    status: 'active',
    category: 'assistant',
    estimateOverallCost: {
      band: 'low',
      estimatedCost: 3,
    },
    quickstart: 'https://github.com/agents-repo/registry/blob/main/README.md',
  };
}

function hasErrorCode(issues: ValidationIssue[], code: string): boolean {
  return issues.some((issue) => issue.code === code && issue.severity === 'error');
}

describe('validateMetadata', (): void => {
  it('accepts valid metadata', (): void => {
    const issues: ValidationIssue[] = [];
    const metadata = makeBaseMetadata();

    const valid = validateMetadata(metadata, 'hello-agent', issues);

    expect(valid).toBe(true);
    expect(issues).toHaveLength(0);
  });

  it('rejects invalid estimateOverallCost values', (): void => {
    const issues: ValidationIssue[] = [];
    const metadata = makeBaseMetadata();
    metadata['estimateOverallCost'] = { band: 'invalid', estimatedCost: 11 };

    const valid = validateMetadata(metadata, 'hello-agent', issues);

    expect(valid).toBe(false);
    expect(hasErrorCode(issues, 'ERR_METADATA_INVALID')).toBe(true);
    expect(
      issues.some((issue) => issue.message.includes('estimateOverallCost.band')),
    ).toBe(true);
    expect(
      issues.some((issue) => issue.message.includes('estimateOverallCost.estimatedCost')),
    ).toBe(true);
  });

  it('rejects duplicate tags and invalid maintainers', (): void => {
    const issues: ValidationIssue[] = [];
    const metadata = makeBaseMetadata();
    metadata['tags'] = ['agent', 'agent'];
    metadata['maintainers'] = ['ok-slug', 'not valid'];

    const valid = validateMetadata(metadata, 'hello-agent', issues);

    expect(valid).toBe(false);
    expect(hasErrorCode(issues, 'ERR_METADATA_INVALID')).toBe(true);
    expect(issues.some((issue) => issue.message.includes('Duplicate tags'))).toBe(true);
    expect(issues.some((issue) => issue.message.includes('maintainers entries'))).toBe(true);
  });

  it('rejects invalid owner slug', (): void => {
    const issues: ValidationIssue[] = [];
    const metadata = makeBaseMetadata();
    metadata['owner'] = 'not valid';

    const valid = validateMetadata(metadata, 'hello-agent', issues);

    expect(valid).toBe(false);
    expect(hasErrorCode(issues, 'ERR_METADATA_INVALID')).toBe(true);
    expect(issues.some((issue) => issue.message.includes('owner must be a GitHub owner or organization slug'))).toBe(true);
  });

  it('rejects compatibility with only planned targets', (): void => {
    const issues: ValidationIssue[] = [];
    const metadata = makeBaseMetadata();
    metadata['compatibility'] = {
      targets: [
        { id: 'github-copilot', status: 'planned' },
        { id: 'cursor', status: 'planned' },
      ],
    };

    const valid = validateMetadata(metadata, 'hello-agent', issues);

    expect(valid).toBe(false);
    expect(
      issues.some((issue) =>
        issue.message.includes('at least one supported or experimental install target'),
      ),
    ).toBe(true);
  });

  it('rejects duplicate compatibility target ids', (): void => {
    const issues: ValidationIssue[] = [];
    const metadata = makeBaseMetadata();
    metadata['compatibility'] = {
      targets: [
        { id: 'cursor', status: 'supported' },
        { id: 'cursor', status: 'experimental' },
      ],
    };

    const valid = validateMetadata(metadata, 'hello-agent', issues);

    expect(valid).toBe(false);
    expect(issues.some((issue) => issue.message.includes('duplicate id'))).toBe(true);
  });

  it('rejects updatedAt older than createdAt', (): void => {
    const issues: ValidationIssue[] = [];
    const metadata = makeBaseMetadata();
    metadata['createdAt'] = '2026-05-22T00:00:00.000Z';
    metadata['updatedAt'] = '2026-05-21T23:59:59.000Z';

    const valid = validateMetadata(metadata, 'hello-agent', issues);

    expect(valid).toBe(false);
    expect(
      issues.some((issue) => issue.message.includes('updatedAt must be greater than')),
    ).toBe(true);
  });
});
