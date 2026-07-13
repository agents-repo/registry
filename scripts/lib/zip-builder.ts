import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { AGENT_FILE_EXT, AGENTS_DIR, VERSIONS_DIR } from './constants';
import { listDeploymentAgentFiles } from './deployment-agents';

const ZIP_WRITE_OPTIONS = { noSort: true } as const;

export function compareUtf16CodeUnits(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

export class ZipBuilder {
  private readonly packageDir: string;
  private readonly version: string;

  constructor(packageDir: string, version: string) {
    this.packageDir = packageDir;
    this.version = version;
  }

  buildDeploymentZip(outputPath: string): void {
    const zip = new AdmZip(ZIP_WRITE_OPTIONS);

    // listDeploymentAgentFiles returns ids sorted for deterministic ZIP bytes.
    for (const file of listDeploymentAgentFiles(this.packageDir)) {
      zip.addFile(
        `${AGENTS_DIR}/${file.id}${AGENT_FILE_EXT}`,
        Buffer.from(file.content, 'utf-8'),
      );
    }

    zip.writeZip(outputPath);
  }

  buildSourceZip(outputPath: string): void {
    const zip = new AdmZip(ZIP_WRITE_OPTIONS);

    const addDir = (dir: string, prefix: string): void => {
      const entries = fs
        .readdirSync(dir, { withFileTypes: true })
        .sort((left, right) => compareUtf16CodeUnits(left.name, right.name));

      for (const entry of entries) {
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
