import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isValidPackagePrTitle,
  validatePackagePrTitleFromEventPath,
} from '../../../../scripts/lib/validate-package-pr-title';

describe('validate-package-pr-title', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts feat(package): titles', () => {
    expect(isValidPackagePrTitle('feat(package): add agents-repo/foo')).toBe(true);
  });

  it('accepts fix(package): titles', () => {
    expect(isValidPackagePrTitle('fix(package): correct agents-repo/foo metadata')).toBe(true);
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
    const dir = mkdtempSync(path.join(os.tmpdir(), 'registry-pr-title-'));
    const eventPath = path.join(dir, 'event.json');
    writeFileSync(
      eventPath,
      JSON.stringify({ pull_request: { title: 'package: add foo' } }),
      'utf8',
    );

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
    const dir = mkdtempSync(path.join(os.tmpdir(), 'registry-pr-title-'));
    const eventPath = path.join(dir, 'event.json');
    writeFileSync(
      eventPath,
      JSON.stringify({ pull_request: { title: 'feat(package): add agents-repo/foo' } }),
      'utf8',
    );

    expect(() => {
      validatePackagePrTitleFromEventPath(eventPath, 'pull_request');
    }).not.toThrow();
  });
});
