import type AdmZip from 'adm-zip';

/** Fixed ZIP entry timestamp so artifact bytes are stable across rebuilds. */
export const DETERMINISTIC_ZIP_ENTRY_TIME = new Date(Date.UTC(2020, 0, 1, 0, 0, 0));

export function addDeterministicZipEntry(
  zip: AdmZip,
  entryName: string,
  content: string | Buffer,
): void {
  const data = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
  zip.addFile(entryName, data);
  const entry = zip.getEntry(entryName);
  if (entry) {
    entry.header.time = DETERMINISTIC_ZIP_ENTRY_TIME;
  }
}
