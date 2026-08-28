import { describe, expect, it } from 'vitest';
import { runPackageCreateSmoke } from '../../scripts/lib/create/smoke';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PACKAGE_CREATE_SMOKE_TIMEOUT_MS = 60_000;

describe('package golden path (e2e)', (): void => {
  it(
    'validates, builds, and verifies artifacts for a fixture package',
    async (): Promise<void> => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-e2e-golden-'));
      try {
        const qualifiedRef = 'agents-repo/smoke-package';
        const result = await runPackageCreateSmoke(qualifiedRef, {
          workspaceDir: tempDir,
          cleanup: false,
        });

        expect(result.version).toBe('1.0.0');
        expect(result.targetArtifactPaths.length).toBeGreaterThan(0);
        expect(fs.existsSync(result.srcZipPath)).toBe(true);
        expect(fs.existsSync(result.manifestPath)).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    },
    PACKAGE_CREATE_SMOKE_TIMEOUT_MS,
  );
});
