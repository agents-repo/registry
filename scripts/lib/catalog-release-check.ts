import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';

/** Package squash-merge titles that must not trigger immediate registry releases. */
export const PACKAGE_SQUASH_MERGE_TITLE_PATTERN = /^(feat|fix)\(package\)!?: ?/;

export const isPackageSquashMergeTitle = (message: string): boolean =>
  PACKAGE_SQUASH_MERGE_TITLE_PATTERN.test(message.trim());

const PACKAGES_PREFIX = 'packages/';

const runGit = async (git: SimpleGit, args: readonly string[]): Promise<string> => {
  const value = await git.raw([...args]);
  return value.trim();
};

/**
 * Latest registry distribution tag (for example `v2.0.1`).
 * Returns `null` when no matching tag exists.
 */
export const getLatestVersionTag = async (
  cwd: string = process.cwd(),
  git: SimpleGit = simpleGit(cwd),
): Promise<string | null> => {
  try {
    const tag = await runGit(git, ['describe', '--tags', '--abbrev=0', '--match', 'v*']);
    return tag.length > 0 ? tag : null;
  } catch {
    return null;
  }
};

/** Paths under `packages/` changed between `fromRef` and `toRef` (inclusive range). */
export const listChangedPackagePathsSinceRef = async (
  fromRef: string,
  toRef: string = 'HEAD',
  cwd: string = process.cwd(),
  git: SimpleGit = simpleGit(cwd),
): Promise<readonly string[]> => {
  const output = await runGit(git, ['diff', '--name-only', `${fromRef}..${toRef}`, '--', PACKAGES_PREFIX]);
  if (output.length === 0) {
    return [];
  }

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.startsWith(PACKAGES_PREFIX));
};

/**
 * Whether `packages/` has commits not yet included in the latest `v*` tag.
 * When no tag exists, any `packages/` tree on `HEAD` counts as unreleased.
 */
export const hasUnreleasedPackageChanges = async (
  cwd: string = process.cwd(),
  git: SimpleGit = simpleGit(cwd),
): Promise<boolean> => {
  const latestTag = await getLatestVersionTag(cwd, git);
  if (latestTag === null) {
    const tree = await runGit(git, ['ls-tree', '--name-only', 'HEAD', 'packages']);
    return tree.length > 0;
  }

  const changed = await listChangedPackagePathsSinceRef(latestTag, 'HEAD', cwd, git);
  return changed.length > 0;
};

export interface CatalogReleaseCheckResult {
  readonly hasUnreleasedChanges: boolean;
  readonly latestTag: string | null;
  readonly changedPaths: readonly string[];
}

export const evaluateCatalogReleaseCheck = async (
  cwd: string = process.cwd(),
  git: SimpleGit = simpleGit(cwd),
): Promise<CatalogReleaseCheckResult> => {
  const latestTag = await getLatestVersionTag(cwd, git);
  if (latestTag === null) {
    const treeOutput = await runGit(git, ['ls-tree', '--name-only', 'HEAD', 'packages']);
    const hasPackages = treeOutput.length > 0;
    return {
      hasUnreleasedChanges: hasPackages,
      latestTag: null,
      changedPaths: hasPackages ? [PACKAGES_PREFIX] : [],
    };
  }

  const changedPaths = await listChangedPackagePathsSinceRef(latestTag, 'HEAD', cwd, git);
  return {
    hasUnreleasedChanges: changedPaths.length > 0,
    latestTag,
    changedPaths,
  };
};

/** CLI entry: exit 0 when catalog release is needed, 1 otherwise. */
export const runCatalogReleaseCheckCli = async (argv: readonly string[]): Promise<void> => {
  const json = argv.includes('--json');
  const cwd = path.resolve(process.cwd());
  const result = await evaluateCatalogReleaseCheck(cwd);

  if (json) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else if (result.hasUnreleasedChanges) {
    const tagLabel = result.latestTag ?? '(no prior tag)';
    process.stdout.write(
      `Catalog release needed since ${tagLabel}: ${result.changedPaths.length} path(s) under packages/\n`,
    );
  } else {
    const tagLabel = result.latestTag ?? '(no prior tag)';
    process.stdout.write(`No unreleased package changes since ${tagLabel}\n`);
  }

  process.exit(result.hasUnreleasedChanges ? 0 : 1);
};
