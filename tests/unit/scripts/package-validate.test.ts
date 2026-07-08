import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const tsxCli = path.join(repoRoot, 'node_modules/tsx/dist/cli.mjs');
const packageValidateScript = path.join(repoRoot, 'scripts/package-validate.ts');

function runPackageValidate(
  packageId: string,
  envOverrides: Record<string, string | undefined>,
): SpawnSyncReturns<string> {
  const env = { ...process.env, ...envOverrides };
  delete env.SKIP_PACKAGE_PR_TITLE_CHECK;

  return spawnSync(process.execPath, [tsxCli, packageValidateScript, '--package', packageId], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
  });
}

describe('package-validate', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir.length > 0) {
      tempDir = '';
    }
  });

  it('enforces package PR titles before package validation in pull_request CI', () => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'registry-package-validate-'));
    const eventPath = path.join(tempDir, 'event.json');
    writeFileSync(
      eventPath,
      JSON.stringify({ pull_request: { title: 'feat: add tooling' } }),
      'utf8',
    );

    const result = runPackageValidate('agents-repo/hello-agent', {
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_EVENT_NAME: 'pull_request',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Package PR title must start with feat(package):');
  });

  it('skips package PR title enforcement when CI env is not a pull request', () => {
    const result = runPackageValidate('agents-repo/hello-agent', {
      GITHUB_EVENT_NAME: 'push',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Validation passed for package: agents-repo/hello-agent');
  });
});
