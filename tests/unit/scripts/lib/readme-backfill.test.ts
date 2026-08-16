import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { afterEach, describe, expect, it } from 'vitest';
import { README_FILENAME } from '../../../../scripts/lib/constants';
import { backfillSnapshotReadmeFromSrcZip } from '../../../../scripts/lib/readme-backfill';

const createdDirs: string[] = [];

function makeVersionDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-readme-backfill-'));
  createdDirs.push(dir);
  return dir;
}

afterEach((): void => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('backfillSnapshotReadmeFromSrcZip', (): void => {
  it('writes README.md from src.zip when the snapshot is missing it', (): void => {
    const versionDir = makeVersionDir();
    const zip = new AdmZip();
    zip.addFile(README_FILENAME, Buffer.from('# from zip\n', 'utf-8'));
    zip.writeZip(path.join(versionDir, '1.0.0-src.zip'));

    expect(backfillSnapshotReadmeFromSrcZip(versionDir, '1.0.0')).toBe('written');
    expect(fs.readFileSync(path.join(versionDir, README_FILENAME), 'utf-8')).toBe('# from zip\n');
  });

  it('does not overwrite an existing snapshot README', (): void => {
    const versionDir = makeVersionDir();
    fs.writeFileSync(path.join(versionDir, README_FILENAME), '# existing\n', 'utf-8');
    const zip = new AdmZip();
    zip.addFile(README_FILENAME, Buffer.from('# from zip\n', 'utf-8'));
    zip.writeZip(path.join(versionDir, '1.0.0-src.zip'));

    expect(backfillSnapshotReadmeFromSrcZip(versionDir, '1.0.0')).toBe('skipped-exists');
    expect(fs.readFileSync(path.join(versionDir, README_FILENAME), 'utf-8')).toBe('# existing\n');
  });

  it('skips when src.zip has no README.md', (): void => {
    const versionDir = makeVersionDir();
    const zip = new AdmZip();
    zip.addFile('metadata.json', Buffer.from('{}', 'utf-8'));
    zip.writeZip(path.join(versionDir, '1.0.0-src.zip'));

    expect(backfillSnapshotReadmeFromSrcZip(versionDir, '1.0.0')).toBe('skipped-missing');
    expect(fs.existsSync(path.join(versionDir, README_FILENAME))).toBe(false);
  });
});
