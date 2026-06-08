import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INSTALL_TARGET_IDS, SCHEMA_FAMILY_INDEX } from '../../scripts/lib/constants';
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
      expect(result.targetArtifactPaths).toHaveLength(INSTALL_TARGET_IDS.length);
      for (const artifactPath of result.targetArtifactPaths) {
        expect(fs.existsSync(artifactPath)).toBe(true);
      }
      expect(fs.existsSync(result.srcZipPath)).toBe(true);
      expect(fs.existsSync(result.manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf-8')) as {
        versions: Array<{
          version: string;
          artifacts: Array<{ target: string; file: string }>;
        }>;
      };
      const versionEntry = manifest.versions.find((entry) => entry.version === result.version);
      expect(versionEntry?.artifacts).toHaveLength(INSTALL_TARGET_IDS.length);
      expect(versionEntry?.artifacts.map((artifact) => artifact.target)).toEqual(
        expect.arrayContaining([...INSTALL_TARGET_IDS]),
      );
      expect(
        result.targetArtifactPaths.map((artifactPath) => path.basename(artifactPath)),
      ).toEqual(expect.arrayContaining(versionEntry?.artifacts.map((artifact) => artifact.file) ?? []));
      expect(result.targetArtifactPaths).toHaveLength(versionEntry?.artifacts.length ?? 0);

      const index = JSON.parse(fs.readFileSync(result.indexPath, 'utf-8')) as {
        schemaVersion: string;
        packages: Array<{ id: string; owner?: string; installTargets?: Array<{ id: string }> }>;
      };
      expect(index.schemaVersion).toBe(getSchemaCurrentVersion(SCHEMA_FAMILY_INDEX));
      const packageEntry = index.packages.find((entry) => entry.id === packageId);
      expect(packageEntry?.owner).toBe('agents-repo');
      expect(packageEntry?.installTargets).toHaveLength(INSTALL_TARGET_IDS.length);
    },
    PACKAGE_CREATE_SMOKE_TIMEOUT_MS,
  );
});
