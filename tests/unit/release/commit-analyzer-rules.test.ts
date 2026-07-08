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

const analyzeCommit = loadDefaultExport<AnalyzeCommitFn>(
  path.join(analyzerLib, 'analyze-commit.js'),
);
const DEFAULT_RELEASE_RULES = loadDefaultExport<readonly ReleaseRule[]>(
  path.join(analyzerLib, 'default-release-rules.js'),
);
const releasercPath = path.join(repoRoot, '.releaserc.json');

const loadCustomReleaseRules = (): ReleaseRule[] => {
  const config = JSON.parse(readFileSync(releasercPath, 'utf8')) as {
    plugins: ReadonlyArray<
      | string
      | [
          string,
          {
            releaseRules?: ReleaseRule[];
          },
        ]
    >;
  };

  const analyzerPlugin = config.plugins.find(
    (plugin): plugin is [string, { releaseRules?: ReleaseRule[] }] =>
      Array.isArray(plugin) && plugin[0] === '@semantic-release/commit-analyzer',
  );

  return analyzerPlugin?.[1]?.releaseRules ?? [];
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

describe('commit-analyzer release rules (.releaserc.json)', () => {
  const customRules = loadCustomReleaseRules();

  it('loads custom release rules from .releaserc.json', () => {
    expect(customRules.length).toBeGreaterThan(0);
    expect(customRules.some((rule) => rule.type === 'feat' && rule.scope === 'package')).toBe(
      true,
    );
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

  it('maps breaking feat(package)!: to major', () => {
    expect(
      resolveReleaseType(
        {
          type: 'feat',
          scope: 'package',
          notes: [{ title: 'BREAKING CHANGE' }],
        },
        customRules,
      ),
    ).toBe('major');
  });

  it('maps unscoped feat: to minor via built-in defaults', () => {
    expect(resolveReleaseType({ type: 'feat' }, customRules)).toBe('minor');
  });

  it('maps scoped non-package feat: to minor via built-in defaults', () => {
    expect(resolveReleaseType({ type: 'feat', scope: 'release' }, customRules)).toBe('minor');
  });

  it('maps fix(package): to patch via built-in defaults', () => {
    expect(resolveReleaseType({ type: 'fix', scope: 'package' }, customRules)).toBe('patch');
  });

  it('maps chore: to no release', () => {
    expect(resolveReleaseType({ type: 'chore' }, customRules)).toBeUndefined();
  });
});
