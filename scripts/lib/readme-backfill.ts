import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { README_FILENAME, SOURCE_ARCHIVE_SUFFIX } from './constants';

export type ReadmeBackfillResult = 'written' | 'skipped-exists' | 'skipped-missing';

export function backfillSnapshotReadmeFromSrcZip(
  versionDir: string,
  version: string,
): ReadmeBackfillResult {
  const snapshotReadmePath = path.join(versionDir, README_FILENAME);
  if (fs.existsSync(snapshotReadmePath)) {
    return 'skipped-exists';
  }

  const srcZipPath = path.join(versionDir, `${version}${SOURCE_ARCHIVE_SUFFIX}`);
  if (!fs.existsSync(srcZipPath)) {
    return 'skipped-missing';
  }

  const zip = new AdmZip(srcZipPath);
  const entry = zip.getEntry(README_FILENAME);
  if (entry === null || entry.isDirectory) {
    return 'skipped-missing';
  }

  fs.writeFileSync(snapshotReadmePath, entry.getData());
  return 'written';
}
