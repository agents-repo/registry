import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { afterEach, describe, expect, it } from 'vitest';
import {
  evaluateCatalogReleaseCheck,
  getLatestVersionTag,
  hasUnreleasedPackageChanges,
  isPackageSquashMergeTitle,
  listChangedPackagePathsSinceRef,
} from '../../../scripts/lib/catalog-release-check';

const tempDirs: string[] = [];

const createTaggedPackageRepo = async (tag = 'v1.0.0'): Promise<{ cwd: string; tag: string }> => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-release-check-'));
  tempDirs.push(cwd);

  const git = simpleGit(cwd);
  await git.init();
  await git.addConfig('user.email', 'test@example.com');
  await git.addConfig('user.name', 'Test');

  const packageDir = path.join(cwd, 'packages', 'agents-repo', 'sample');
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(path.join(packageDir, 'metadata.json'), '{}\n');

  await git.add('.');
  await git.commit('add sample package');
  await git.addTag(tag);

  return { cwd, tag };
};

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  tempDirs.length = 0;
});

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
    const { cwd, tag } = await createTaggedPackageRepo();

    const latestTag = await getLatestVersionTag(cwd);
    expect(latestTag).toBe(tag);

    const changed = await listChangedPackagePathsSinceRef(tag, 'HEAD', cwd);
    const hasChanges = await hasUnreleasedPackageChanges(cwd);
    const result = await evaluateCatalogReleaseCheck(cwd);

    expect(changed).toEqual([]);
    expect(hasChanges).toBe(false);
    expect(result.hasUnreleasedChanges).toBe(false);
    expect(result.latestTag).toBe(tag);
  });

  it('detects unreleased package changes after the latest tag', async () => {
    const { cwd, tag } = await createTaggedPackageRepo();
    const git = simpleGit(cwd);

    const packageDir = path.join(cwd, 'packages', 'agents-repo', 'sample');
    fs.writeFileSync(path.join(packageDir, 'metadata.json'), '{ "version": "1.0.1" }\n');
    await git.add('.');
    await git.commit('bump sample package');

    const changed = await listChangedPackagePathsSinceRef(tag, 'HEAD', cwd);
    const hasChanges = await hasUnreleasedPackageChanges(cwd);
    const result = await evaluateCatalogReleaseCheck(cwd);

    expect(changed).toContain('packages/agents-repo/sample/metadata.json');
    expect(hasChanges).toBe(true);
    expect(result.hasUnreleasedChanges).toBe(true);
    expect(result.latestTag).toBe(tag);
  });
});
