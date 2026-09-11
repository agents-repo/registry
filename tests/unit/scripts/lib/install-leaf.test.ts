import { describe, expect, it } from 'vitest';
import { computeInstallLeaf } from '../../../../scripts/lib/install-leaf';

describe('computeInstallLeaf', () => {
  it('joins namespace, package id, and source id with -- delimiters', () => {
    expect(computeInstallLeaf('agents-repo', 'hello-agent', 'planner')).toBe(
      'agents-repo--hello-agent--planner',
    );
  });

  it('avoids collisions when hyphen boundaries differ across packages', () => {
    const left = computeInstallLeaf('agents', 'repo-hello-agent', 'planner');
    const right = computeInstallLeaf('agents-repo', 'hello-agent', 'planner');
    expect(left).toBe('agents--repo-hello-agent--planner');
    expect(right).toBe('agents-repo--hello-agent--planner');
    expect(left).not.toBe(right);
  });
});
