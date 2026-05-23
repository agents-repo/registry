import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runPackageCreateSmoke } from '../../scripts/lib/create/smoke';

let tempDir = '';

beforeEach((): void => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-package-create-flow-'));
});

afterEach((): void => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('package create smoke flow', (): void => {
  it('creates, validates, builds, and verifies a dummy package without AI', async (): Promise<void> => {
    const packageId = 'smoke-package';
    const result = await runPackageCreateSmoke(packageId, {
      workspaceDir: tempDir,
      cleanup: false,
    });

    expect(result.version).toBe('1.0.0');
    expect(fs.existsSync(result.deployZipPath)).toBe(true);
    expect(fs.existsSync(result.srcZipPath)).toBe(true);
    expect(fs.existsSync(result.manifestPath)).toBe(true);
  });
});
