import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { AGENTS_DIR, VERSIONS_DIR } from './constants';
import { listDeploymentAgentFiles } from './deployment-agents';

export class ZipBuilder {
  private readonly packageDir: string;
  private readonly version: string;

  constructor(packageDir: string, version: string) {
    this.packageDir = packageDir;
    this.version = version;
  }

  buildDeploymentZip(outputPath: string): void {
    const zip = new AdmZip();

    for (const file of listDeploymentAgentFiles(this.packageDir)) {
      zip.addFile(
        `${AGENTS_DIR}/${file.id}.agent.md`,
        Buffer.from(file.content, 'utf-8'),
      );
    }

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
