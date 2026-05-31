import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SCHEMA_FAMILY_INDEX } from '../../scripts/lib/constants';
import { runPackageCreateSmoke } from '../../scripts/lib/create/smoke';
import { getSchemaCurrentVersion } from '../../scripts/lib/schema-versions';

const PACKAGE_CREATE_SMOKE_TIMEOUT_MS = 60_000;

let tempDir = '';

beforeEach((): void => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-package-create-flow-'));
});

afterEach((): void => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('package create smoke flow', (): void => {
  it(
    'creates, validates, builds, and verifies a dummy package without AI',
    async (): Promise<void> => {
      const packageId = 'smoke-package';
      const result = await runPackageCreateSmoke(packageId, {
        workspaceDir: tempDir,
        cleanup: false,
      });

      expect(result.version).toBe('1.0.0');
      expect(fs.existsSync(result.deployZipPath)).toBe(true);
      expect(fs.existsSync(result.srcZipPath)).toBe(true);
      expect(fs.existsSync(result.manifestPath)).toBe(true);

      const index = JSON.parse(fs.readFileSync(result.indexPath, 'utf-8')) as {
        schemaVersion: string;
        packages: Array<{ id: string; owner?: string }>;
      };
      expect(index.schemaVersion).toBe(getSchemaCurrentVersion(SCHEMA_FAMILY_INDEX));
      expect(index.packages.find((entry) => entry.id === packageId)?.owner).toBe('agents-repo');
    },
    PACKAGE_CREATE_SMOKE_TIMEOUT_MS,
  );
});
