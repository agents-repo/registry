import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { restoreTrackedFile } from '../../../../../scripts/lib/build/rollback';

const createdDirs: string[] = [];

afterEach((): void => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('restoreTrackedFile', (): void => {
  it('restores previous content after a later write', (): void => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-rollback-'));
    createdDirs.push(dir);
    const filePath = path.join(dir, 'manifest.json');
    fs.writeFileSync(filePath, 'original\n', 'utf-8');
    fs.writeFileSync(filePath, 'updated\n', 'utf-8');

    restoreTrackedFile(filePath, 'original\n');

    expect(fs.readFileSync(filePath, 'utf-8')).toBe('original\n');
  });

  it('removes a file that did not exist before the failed update', (): void => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-rollback-'));
    createdDirs.push(dir);
    const filePath = path.join(dir, 'index.json');
    fs.writeFileSync(filePath, 'new\n', 'utf-8');

    restoreTrackedFile(filePath, null);

    expect(fs.existsSync(filePath)).toBe(false);
  });
});
