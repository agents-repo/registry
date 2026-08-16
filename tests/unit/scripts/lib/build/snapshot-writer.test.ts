import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { METADATA_FILENAME, README_FILENAME } from '../../../../../scripts/lib/constants';
import { prepareVersionSnapshot } from '../../../../../scripts/lib/build/snapshot-writer';
import { Package } from '../../../../../scripts/lib/package';
import { createDummyPackage } from '../../../../helpers/package-factory';

const tempDirs: string[] = [];

function makeRepoRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-snapshot-writer-'));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'packages'), { recursive: true });
  return dir;
}

afterEach((): void => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('prepareVersionSnapshot', (): void => {
  it('copies package-root README.md into the version snapshot', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'snapshot-readme');
    fs.writeFileSync(path.join(packageDir, README_FILENAME), '# snapshot-readme\n', 'utf-8');

    const pkg = new Package('agents-repo/snapshot-readme', path.join(repoRoot, 'packages'));
    const versionDir = pkg.versionDir('1.0.0');
    prepareVersionSnapshot(pkg, versionDir, '1.0.0');

    expect(fs.readFileSync(path.join(versionDir, README_FILENAME), 'utf-8')).toBe('# snapshot-readme\n');
    expect(fs.existsSync(path.join(versionDir, METADATA_FILENAME))).toBe(true);
  });

  it('omits snapshot README.md when the package root has none', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'snapshot-no-readme');
    fs.rmSync(path.join(packageDir, README_FILENAME));

    const pkg = new Package('agents-repo/snapshot-no-readme', path.join(repoRoot, 'packages'));
    const versionDir = pkg.versionDir('1.0.0');
    prepareVersionSnapshot(pkg, versionDir, '1.0.0');

    expect(fs.existsSync(path.join(versionDir, README_FILENAME))).toBe(false);
  });
});
