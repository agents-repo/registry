import { describe, expect, it } from 'vitest';
import {
  evaluateCatalogReleaseCheck,
  getLatestVersionTag,
  hasUnreleasedPackageChanges,
  isPackageSquashMergeTitle,
  listChangedPackagePathsSinceRef,
} from '../../../scripts/lib/catalog-release-check';

describe('isPackageSquashMergeTitle', () => {
  it('matches feat(package): titles', () => {
    expect(isPackageSquashMergeTitle('feat(package): add agents-repo/foo')).toBe(true);
  });

  it('matches fix(package)!: titles', () => {
    expect(isPackageSquashMergeTitle('fix(package)!: correct agents-repo/foo')).toBe(true);
  });

  it('does not match platform feat: titles', () => {
    expect(isPackageSquashMergeTitle('feat: daily batched catalog releases')).toBe(false);
  });
});

describe('catalog-release-check git helpers', () => {
  it('detects no unreleased package changes when HEAD matches latest tag', async () => {
    const latestTag = await getLatestVersionTag();
    expect(latestTag).not.toBeNull();

    const changed = await listChangedPackagePathsSinceRef(latestTag as string, 'HEAD');
    const hasChanges = await hasUnreleasedPackageChanges();
    const result = await evaluateCatalogReleaseCheck();

    expect(changed).toEqual([]);
    expect(hasChanges).toBe(false);
    expect(result.hasUnreleasedChanges).toBe(false);
    expect(result.latestTag).toBe(latestTag);
  });
});
