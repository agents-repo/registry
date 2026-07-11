import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isValidPackagePrTitle,
  validatePackagePrTitleFromCiEnv,
  validatePackagePrTitleFromEventPath,
} from '../../../../scripts/lib/validate-package-pr-title';

const tempDirs: string[] = [];

const createTempEventPath = (payload: object): string => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'registry-pr-title-'));
  tempDirs.push(dir);
  const eventPath = path.join(dir, 'event.json');
  writeFileSync(eventPath, JSON.stringify(payload), 'utf8');
  return eventPath;
};

describe('validate-package-pr-title', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('accepts feat(package): titles', () => {
    expect(isValidPackagePrTitle('feat(package): add agents-repo/foo')).toBe(true);
  });

  it('accepts fix(package): titles', () => {
    expect(isValidPackagePrTitle('fix(package): correct agents-repo/foo metadata')).toBe(true);
  });

  it('accepts breaking feat(package)!: titles', () => {
    expect(isValidPackagePrTitle('feat(package)!: remove deprecated agents')).toBe(true);
  });

  it('accepts breaking fix(package)!: titles', () => {
    expect(isValidPackagePrTitle('fix(package)!: drop legacy flow contract')).toBe(true);
  });

  it('accepts titles without a space after the colon', () => {
    expect(isValidPackagePrTitle('feat(package):add agents-repo/foo')).toBe(true);
  });

  it('rejects legacy package: titles', () => {
    expect(isValidPackagePrTitle('package: add agents-repo/foo')).toBe(false);
  });

  it('rejects unrelated feat titles', () => {
    expect(isValidPackagePrTitle('feat: add tooling')).toBe(false);
  });

  it('passes when event is not a pull request', () => {
    expect(() => {
      validatePackagePrTitleFromEventPath(undefined, 'push');
    }).not.toThrow();
  });

  it('exits when pull request title is invalid', () => {
    const eventPath = createTempEventPath({ pull_request: { title: 'package: add foo' } });
    let exitCode: number | undefined;
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      exitCode = typeof code === 'number' ? code : undefined;
      throw new Error('process.exit');
    });

    expect(() => {
      validatePackagePrTitleFromEventPath(eventPath, 'pull_request');
    }).toThrow('process.exit');
    expect(exitCode).toBe(1);
  });

  it('passes when pull request title is valid', () => {
    const eventPath = createTempEventPath({
      pull_request: { title: 'feat(package): add agents-repo/foo' },
    });
    expect(() => {
      validatePackagePrTitleFromEventPath(eventPath, 'pull_request');
    }).not.toThrow();
  });

  it('passes when pull request title uses feat(package)!:', () => {
    const eventPath = createTempEventPath({
      pull_request: { title: 'feat(package)!: publish agents-repo/foo 2.0.0' },
    });
    expect(() => {
      validatePackagePrTitleFromEventPath(eventPath, 'pull_request');
    }).not.toThrow();
  });

  it('exits from CI env when pull request title is invalid and skip is unset', () => {
    const eventPath = createTempEventPath({ pull_request: { title: 'feat: add tooling' } });
    const previousSkip = process.env.SKIP_PACKAGE_PR_TITLE_CHECK;
    const previousEventPath = process.env.GITHUB_EVENT_PATH;
    const previousEventName = process.env.GITHUB_EVENT_NAME;

    delete process.env.SKIP_PACKAGE_PR_TITLE_CHECK;
    process.env.GITHUB_EVENT_PATH = eventPath;
    process.env.GITHUB_EVENT_NAME = 'pull_request';

    let exitCode: number | undefined;
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      exitCode = typeof code === 'number' ? code : undefined;
      throw new Error('process.exit');
    });

    try {
      expect(() => {
        validatePackagePrTitleFromCiEnv();
      }).toThrow('process.exit');
      expect(exitCode).toBe(1);
    } finally {
      if (previousSkip === undefined) {
        delete process.env.SKIP_PACKAGE_PR_TITLE_CHECK;
      } else {
        process.env.SKIP_PACKAGE_PR_TITLE_CHECK = previousSkip;
      }
      if (previousEventPath === undefined) {
        delete process.env.GITHUB_EVENT_PATH;
      } else {
        process.env.GITHUB_EVENT_PATH = previousEventPath;
      }
      if (previousEventName === undefined) {
        delete process.env.GITHUB_EVENT_NAME;
      } else {
        process.env.GITHUB_EVENT_NAME = previousEventName;
      }
    }
  });

  it('skips CI validation when SKIP_PACKAGE_PR_TITLE_CHECK is set', () => {
    const eventPath = createTempEventPath({
      pull_request: { title: 'package: invalid title' },
    });
    const previousSkip = process.env.SKIP_PACKAGE_PR_TITLE_CHECK;
    const previousEventPath = process.env.GITHUB_EVENT_PATH;
    const previousEventName = process.env.GITHUB_EVENT_NAME;

    process.env.SKIP_PACKAGE_PR_TITLE_CHECK = '1';
    process.env.GITHUB_EVENT_PATH = eventPath;
    process.env.GITHUB_EVENT_NAME = 'pull_request';

    try {
      expect(() => {
        validatePackagePrTitleFromCiEnv();
      }).not.toThrow();
    } finally {
      if (previousSkip === undefined) {
        delete process.env.SKIP_PACKAGE_PR_TITLE_CHECK;
      } else {
        process.env.SKIP_PACKAGE_PR_TITLE_CHECK = previousSkip;
      }
      if (previousEventPath === undefined) {
        delete process.env.GITHUB_EVENT_PATH;
      } else {
        process.env.GITHUB_EVENT_PATH = previousEventPath;
      }
      if (previousEventName === undefined) {
        delete process.env.GITHUB_EVENT_NAME;
      } else {
        process.env.GITHUB_EVENT_NAME = previousEventName;
      }
    }
  });
});
