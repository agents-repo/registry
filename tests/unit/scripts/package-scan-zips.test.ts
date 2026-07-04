import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MANIFEST_FILENAME, METADATA_FILENAME, VERSIONS_DIR } from '../../../scripts/lib/constants';
import {
  collectPackageSnapshotTargets,
  scanPackageSnapshotTargets,
  type PackageSnapshotTarget,
} from '../../../scripts/package-scan-zips';

const validateMock = vi.fn();
const validatorFactoryMock = vi.fn();

let tempDir = '';

beforeEach((): void => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-zip-scan-'));
  validateMock.mockReset();
  validatorFactoryMock.mockReset();
});

afterEach((): void => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function writeSnapshot(namespace: string, packageId: string, version: string): void {
  const packageDir = path.join(tempDir, namespace, packageId);
  const versionDir = path.join(packageDir, VERSIONS_DIR, version);
  fs.mkdirSync(versionDir, { recursive: true });
  fs.writeFileSync(path.join(packageDir, METADATA_FILENAME), '{}');
  fs.writeFileSync(
    path.join(packageDir, VERSIONS_DIR, MANIFEST_FILENAME),
    JSON.stringify({ latest: version, versions: [{ version, artifacts: [] }] }),
  );
  fs.writeFileSync(path.join(versionDir, `${version}.zip`), 'zip');
  fs.writeFileSync(path.join(versionDir, `${version}-src.zip`), 'zip');
}

describe('collectPackageSnapshotTargets', (): void => {
  it('collects release version snapshots from the package tree', (): void => {
    writeSnapshot('agents-repo', 'alpha', '1.0.0');
    writeSnapshot('agents-repo', 'beta', '2.0.0');
    fs.mkdirSync(path.join(tempDir, 'agents-repo', 'alpha', VERSIONS_DIR, 'v1.0.0'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'agents-repo', 'alpha', VERSIONS_DIR, 'draft'), { recursive: true });

    const targets = collectPackageSnapshotTargets(tempDir);

    expect(targets).toEqual<PackageSnapshotTarget[]>([
      { qualifiedRef: 'agents-repo/alpha', version: '1.0.0' },
      { qualifiedRef: 'agents-repo/beta', version: '2.0.0' },
    ]);
  });

  it('sorts versions using semver ordering within a package', (): void => {
    writeSnapshot('agents-repo', 'alpha', '2.0.0');
    writeSnapshot('agents-repo', 'alpha', '10.0.0');

    const targets = collectPackageSnapshotTargets(tempDir);

    expect(targets).toEqual<PackageSnapshotTarget[]>([
      { qualifiedRef: 'agents-repo/alpha', version: '2.0.0' },
      { qualifiedRef: 'agents-repo/alpha', version: '10.0.0' },
    ]);
  });
});

describe('scanPackageSnapshotTargets', (): void => {
  it('runs SnapshotValidator for each target', (): void => {
    const targets: PackageSnapshotTarget[] = [
      { qualifiedRef: 'agents-repo/alpha', version: '1.0.0' },
      { qualifiedRef: 'agents-repo/beta', version: '2.0.0' },
    ];

    validateMock
      .mockReturnValueOnce({ packageId: 'agents-repo/alpha', errors: [], warnings: [], passed: true })
      .mockReturnValueOnce({
        packageId: 'agents-repo/beta',
        errors: [{ code: 'ERR_ZIP_DISALLOWED_PAYLOAD', message: 'blocked', severity: 'error' }],
        warnings: [],
        passed: false,
      });

    validatorFactoryMock
      .mockReturnValueOnce({ validate: validateMock })
      .mockReturnValueOnce({ validate: validateMock });

    const results = scanPackageSnapshotTargets(tempDir, targets, validatorFactoryMock);

    expect(validatorFactoryMock).toHaveBeenNthCalledWith(1, 'agents-repo/alpha', '1.0.0', tempDir);
    expect(validatorFactoryMock).toHaveBeenNthCalledWith(2, 'agents-repo/beta', '2.0.0', tempDir);
    expect(results).toHaveLength(2);
    expect(results[1]?.report.passed).toBe(false);
  });
});
