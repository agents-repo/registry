import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

interface ParsedCommit {
  readonly type?: string;
  readonly scope?: string | null;
  readonly notes?: ReadonlyArray<{ readonly title: string }>;
}

interface ReleaseRule {
  readonly type?: string;
  readonly scope?: string;
  readonly breaking?: boolean;
  readonly release?: string | false | null;
}

type ReleaseType = 'major' | 'minor' | 'patch';

type AnalyzeCommitFn = (
  rules: readonly ReleaseRule[],
  commit: ParsedCommit,
) => ReleaseType | false | null | undefined;

interface CommitAnalyzerPluginConfig {
  readonly preset?: string;
  readonly releaseRules?: ReleaseRule[];
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(import.meta.url);
const analyzerLib = path.join(repoRoot, 'node_modules/@semantic-release/commit-analyzer/lib');

const loadDefaultExport = <T>(modulePath: string): T => {
  const loaded: unknown = require(modulePath);
  if (typeof loaded === 'object' && loaded !== null && 'default' in loaded) {
    return (loaded as { default: T }).default;
  }
  return loaded as T;
};

const noopLogger = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
};

type AnalyzeCommitsFn = (
  pluginConfig: CommitAnalyzerPluginConfig,
  context: {
    commits: ReadonlyArray<{ message: string; hash: string }>;
    cwd: string;
    logger: typeof noopLogger;
  },
) => Promise<ReleaseType | null>;

const analyzeCommit = loadDefaultExport<AnalyzeCommitFn>(
  path.join(analyzerLib, 'analyze-commit.js'),
);
const DEFAULT_RELEASE_RULES = loadDefaultExport<readonly ReleaseRule[]>(
  path.join(analyzerLib, 'default-release-rules.js'),
);
interface CommitAnalyzerModule {
  readonly analyzeCommits: AnalyzeCommitsFn;
}

const loadAnalyzeCommits = (): AnalyzeCommitsFn => {
  const loaded = require(
    path.join(repoRoot, 'node_modules/@semantic-release/commit-analyzer/index.js'),
  ) as CommitAnalyzerModule;

  return loaded.analyzeCommits;
};

const analyzeCommits = loadAnalyzeCommits();
const releasercPath = path.join(repoRoot, '.releaserc.json');

const loadCommitAnalyzerPluginConfig = (): CommitAnalyzerPluginConfig => {
  const config = JSON.parse(readFileSync(releasercPath, 'utf8')) as {
    plugins: ReadonlyArray<
      | string
      | [
          string,
          CommitAnalyzerPluginConfig,
        ]
    >;
  };

  const analyzerPlugin = config.plugins.find(
    (plugin): plugin is [string, CommitAnalyzerPluginConfig] =>
      Array.isArray(plugin) && plugin[0] === '@semantic-release/commit-analyzer',
  );

  return analyzerPlugin?.[1] ?? {};
};

const loadCustomReleaseRules = (): ReleaseRule[] => {
  return loadCommitAnalyzerPluginConfig().releaseRules ?? [];
};

const analyzeCommitForRelease = (
  rules: readonly ReleaseRule[],
  commit: ParsedCommit,
): ReleaseType | undefined => {
  const result = analyzeCommit(rules, commit);
  if (result === undefined || result === null || result === false) {
    return undefined;
  }
  return result;
};

/** Mirrors `analyzeCommits` in `@semantic-release/commit-analyzer/index.js`. */
const resolveReleaseType = (
  commit: ParsedCommit,
  customRules: readonly ReleaseRule[],
): ReleaseType | undefined => {
  const customMatch = analyzeCommitForRelease(customRules, commit);
  if (customMatch !== undefined) {
    return customMatch;
  }

  return analyzeCommitForRelease(DEFAULT_RELEASE_RULES, commit);
};

const analyzeCommitMessage = async (message: string): Promise<ReleaseType | null> => {
  const pluginConfig = loadCommitAnalyzerPluginConfig();

  return analyzeCommits(pluginConfig, {
    commits: [{ message, hash: 'abc1234' }],
    cwd: repoRoot,
    logger: noopLogger,
  });
};

const breakingFooter = [{ title: 'BREAKING CHANGE' }] as const;

describe('commit-analyzer release rules (.releaserc.json)', () => {
  const customRules = loadCustomReleaseRules();

  it('loads custom release rules from .releaserc.json', () => {
    expect(customRules.length).toBeGreaterThan(0);
    expect(customRules.some((rule) => rule.type === 'feat' && rule.scope === 'package')).toBe(
      true,
    );
  });

  it('does not include a blanket breaking=>major custom rule', () => {
    const hasBlanketBreakingMajor = customRules.some(
      (rule) => rule.breaking === true && rule.release === 'major' && rule.type === undefined,
    );
    expect(hasBlanketBreakingMajor).toBe(false);
  });

  it('includes explicit feat(package) and fix(package) patch rules', () => {
    expect(
      customRules.some(
        (rule) => rule.type === 'feat' && rule.scope === 'package' && rule.release === 'patch',
      ),
    ).toBe(true);
    expect(
      customRules.some(
        (rule) => rule.type === 'fix' && rule.scope === 'package' && rule.release === 'patch',
      ),
    ).toBe(true);
  });

  it('does not include a competing unscoped feat=>minor custom rule', () => {
    const hasUnscopedFeatMinor = customRules.some(
      (rule) => rule.type === 'feat' && rule.release === 'minor' && rule.scope === undefined,
    );
    expect(hasUnscopedFeatMinor).toBe(false);
  });

  it('maps feat(package): to patch', () => {
    expect(resolveReleaseType({ type: 'feat', scope: 'package' }, customRules)).toBe('patch');
  });

  it('maps breaking feat(package)!: to patch', () => {
    expect(
      resolveReleaseType(
        {
          type: 'feat',
          scope: 'package',
          notes: [...breakingFooter],
        },
        customRules,
      ),
    ).toBe('patch');
  });

  it('maps breaking fix(package)!: to patch', () => {
    expect(
      resolveReleaseType(
        {
          type: 'fix',
          scope: 'package',
          notes: [...breakingFooter],
        },
        customRules,
      ),
    ).toBe('patch');
  });

  it('maps fix(package) with BREAKING CHANGE footer to patch', () => {
    expect(
      resolveReleaseType(
        {
          type: 'fix',
          scope: 'package',
          notes: [...breakingFooter],
        },
        customRules,
      ),
    ).toBe('patch');
  });

  it('short-circuits default breaking=>major when custom package rules match', () => {
    const commit = {
      type: 'feat',
      scope: 'package',
      notes: [...breakingFooter],
    } as const;

    expect(analyzeCommitForRelease(customRules, commit)).toBe('patch');
    expect(analyzeCommitForRelease(DEFAULT_RELEASE_RULES, commit)).toBe('major');
    expect(resolveReleaseType(commit, customRules)).toBe('patch');
  });

  it('maps unscoped feat: to minor via built-in defaults', () => {
    expect(resolveReleaseType({ type: 'feat' }, customRules)).toBe('minor');
  });

  it('maps unscoped breaking feat!: to major via built-in defaults', () => {
    expect(
      resolveReleaseType(
        {
          type: 'feat',
          notes: [...breakingFooter],
        },
        customRules,
      ),
    ).toBe('major');
  });

  it('maps scoped non-package breaking feat: to major via built-in defaults', () => {
    expect(
      resolveReleaseType(
        {
          type: 'feat',
          scope: 'release',
          notes: [...breakingFooter],
        },
        customRules,
      ),
    ).toBe('major');
  });

  it('maps scoped non-package feat: to minor via built-in defaults', () => {
    expect(resolveReleaseType({ type: 'feat', scope: 'release' }, customRules)).toBe('minor');
  });

  it('maps fix(package): to patch via custom rules', () => {
    expect(resolveReleaseType({ type: 'fix', scope: 'package' }, customRules)).toBe('patch');
  });

  it('maps chore: to no release', () => {
    expect(resolveReleaseType({ type: 'chore' }, customRules)).toBeUndefined();
  });
});

describe('commit-analyzer analyzeCommits integration (.releaserc.json)', () => {
  it('uses the conventionalcommits preset parser with custom releaseRules only', () => {
    expect(loadCommitAnalyzerPluginConfig().preset).toBe('conventionalcommits');
  });

  it('maps feat(package)!: commit messages to patch via analyzeCommits', async () => {
    await expect(
      analyzeCommitMessage('feat(package)!: publish agents-repo/foo 2.0.0'),
    ).resolves.toBe('patch');
  });

  it('maps fix(package)!: commit messages to patch via analyzeCommits', async () => {
    await expect(analyzeCommitMessage('fix(package)!: correct agents-repo/foo')).resolves.toBe(
      'patch',
    );
  });

  it('maps feat(package): commit messages to patch via analyzeCommits', async () => {
    await expect(analyzeCommitMessage('feat(package): add agents-repo/foo')).resolves.toBe(
      'patch',
    );
  });

  it('maps unscoped feat!: commit messages to major via analyzeCommits', async () => {
    await expect(analyzeCommitMessage('feat!: remove legacy manifest field')).resolves.toBe(
      'major',
    );
  });
});
