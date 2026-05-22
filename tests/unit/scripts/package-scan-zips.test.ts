import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function writeSnapshot(packageId: string, version: string): void {
  const versionDir = path.join(tempDir, packageId, 'versions', version);
  fs.mkdirSync(versionDir, { recursive: true });
  fs.writeFileSync(path.join(versionDir, `${version}.zip`), 'zip');
  fs.writeFileSync(path.join(versionDir, `${version}-src.zip`), 'zip');
}

describe('collectPackageSnapshotTargets', (): void => {
  it('collects release version snapshots from the package tree', (): void => {
    writeSnapshot('alpha', '1.0.0');
    writeSnapshot('beta', '2.0.0');
    fs.mkdirSync(path.join(tempDir, 'alpha', 'versions', 'draft'), { recursive: true });

    const targets = collectPackageSnapshotTargets(tempDir);

    expect(targets).toEqual<PackageSnapshotTarget[]>([
      { packageId: 'alpha', version: '1.0.0' },
      { packageId: 'beta', version: '2.0.0' },
    ]);
  });
});

describe('scanPackageSnapshotTargets', (): void => {
  it('runs SnapshotValidator for each target', (): void => {
    const targets: PackageSnapshotTarget[] = [
      { packageId: 'alpha', version: '1.0.0' },
      { packageId: 'beta', version: '2.0.0' },
    ];

    validateMock
      .mockReturnValueOnce({ packageId: 'alpha', errors: [], warnings: [], passed: true })
      .mockReturnValueOnce({
        packageId: 'beta',
        errors: [{ code: 'ERR_ZIP_DISALLOWED_PAYLOAD', message: 'blocked', severity: 'error' }],
        warnings: [],
        passed: false,
      });

    validatorFactoryMock
      .mockReturnValueOnce({ validate: validateMock })
      .mockReturnValueOnce({ validate: validateMock });

    const results = scanPackageSnapshotTargets(tempDir, targets, validatorFactoryMock);

    expect(validatorFactoryMock).toHaveBeenNthCalledWith(1, 'alpha', '1.0.0', tempDir);
    expect(validatorFactoryMock).toHaveBeenNthCalledWith(2, 'beta', '2.0.0', tempDir);
    expect(results).toHaveLength(2);
    expect(results[1]?.report.passed).toBe(false);
  });
});
