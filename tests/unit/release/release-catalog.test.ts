import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cwd as getCwd } from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import semanticRelease from 'semantic-release';
import { runCatalogRelease } from '../../../scripts/lib/release-catalog';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const releaseCatalogScriptUrl = pathToFileURL(path.join(repoRoot, 'scripts/release-catalog.ts')).href;
const tempDirs: string[] = [];

vi.mock('semantic-release', () => ({
  default: vi.fn(async () => undefined),
}));

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('runCatalogRelease', () => {
  it('changes cwd to the repository root before invoking semantic-release', async () => {
    const outsideRepo = mkdtempSync(path.join(os.tmpdir(), 'release-catalog-outside-'));
    tempDirs.push(outsideRepo);

    const previousCwd = getCwd();
    process.chdir(outsideRepo);

    try {
      await runCatalogRelease(releaseCatalogScriptUrl, ['--dry-run']);

      expect(getCwd()).toBe(repoRoot);
      expect(semanticRelease).toHaveBeenCalledOnce();
    } finally {
      process.chdir(previousCwd);
    }
  });

  it('honors REGISTRY_REPO_ROOT when resolving the release working directory', async () => {
    const customRepoRoot = mkdtempSync(path.join(os.tmpdir(), 'release-catalog-custom-root-'));
    tempDirs.push(customRepoRoot);
    writeFileSync(
      path.join(customRepoRoot, '.releaserc.catalog.json'),
      JSON.stringify({
        branches: ['main'],
        tagFormat: 'v${version}',
        plugins: ['./scripts/semantic-release/catalog-batch-plugin.mjs'],
      }),
    );

    const previousCwd = getCwd();
    vi.stubEnv('REGISTRY_REPO_ROOT', customRepoRoot);

    try {
      await runCatalogRelease(releaseCatalogScriptUrl, ['--dry-run']);

      expect(getCwd()).toBe(customRepoRoot);
      expect(semanticRelease).toHaveBeenCalledOnce();
    } finally {
      process.chdir(previousCwd);
      delete process.env.REGISTRY_REPO_ROOT;
    }
  });
});
