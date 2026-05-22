import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { PackageError, ErrorCode } from './errors';
import { AGENT_FILE_EXT, AGENTS_DIR, FLOWS_DIR, VERSIONS_DIR } from './constants';

export class ZipBuilder {
  private readonly packageDir: string;
  private readonly version: string;

  constructor(packageDir: string, version: string) {
    this.packageDir = packageDir;
    this.version = version;
  }

  private addDeploymentEntriesFromDir(
    zip: AdmZip,
    seenEntries: Set<string>,
    sourceDir: string,
  ): void {
    if (!fs.existsSync(sourceDir)) {
      return;
    }

    for (const fileName of fs.readdirSync(sourceDir)) {
      if (!fileName.endsWith(AGENT_FILE_EXT)) {
        continue;
      }

      const entryName = `${AGENTS_DIR}/${fileName}`;
      if (seenEntries.has(entryName)) {
        throw new PackageError(
          ErrorCode.ERR_ZIP_COLLISION,
          `Collision building deployment ZIP: "${entryName}" already exists`,
        );
      }

      seenEntries.add(entryName);
      zip.addFile(entryName, fs.readFileSync(path.join(sourceDir, fileName)));
    }
  }

  buildDeploymentZip(outputPath: string): void {
    const zip = new AdmZip();
    const seenEntries = new Set<string>();

    this.addDeploymentEntriesFromDir(zip, seenEntries, path.join(this.packageDir, AGENTS_DIR));
    // Flows are merged into agents/ in the deployment ZIP.
    this.addDeploymentEntriesFromDir(zip, seenEntries, path.join(this.packageDir, FLOWS_DIR));

    zip.writeZip(outputPath);
  }

  buildSourceZip(outputPath: string): void {
    const zip = new AdmZip();

    const addDir = (dir: string, prefix: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === VERSIONS_DIR) continue;
        const fullPath = path.join(dir, entry.name);
        const zipName = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          addDir(fullPath, zipName);
        } else {
          zip.addFile(zipName, fs.readFileSync(fullPath));
        }
      }
    };

    addDir(this.packageDir, '');
    zip.writeZip(outputPath);
  }
}
