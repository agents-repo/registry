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

  buildDeploymentZip(outputPath: string): void {
    const zip = new AdmZip();
    const seenEntries = new Set<string>();

    const agentsDir = path.join(this.packageDir, AGENTS_DIR);
    if (fs.existsSync(agentsDir)) {
      for (const f of fs.readdirSync(agentsDir)) {
        if (f.endsWith(AGENT_FILE_EXT)) {
          const entryName = `${AGENTS_DIR}/${f}`;
          if (seenEntries.has(entryName)) {
            throw new PackageError(
              ErrorCode.ERR_ZIP_COLLISION,
              `Collision building deployment ZIP: "${entryName}" already exists`,
            );
          }
          seenEntries.add(entryName);
          zip.addFile(entryName, fs.readFileSync(path.join(agentsDir, f)));
        }
      }
    }

    const flowsDir = path.join(this.packageDir, FLOWS_DIR);
    if (fs.existsSync(flowsDir)) {
      for (const f of fs.readdirSync(flowsDir)) {
        if (f.endsWith(AGENT_FILE_EXT)) {
          // Flows are merged into agents/ in the deployment ZIP
          const entryName = `${AGENTS_DIR}/${f}`;
          if (seenEntries.has(entryName)) {
            throw new PackageError(
              ErrorCode.ERR_ZIP_COLLISION,
              `Collision building deployment ZIP: "${entryName}" already exists`,
            );
          }
          seenEntries.add(entryName);
          zip.addFile(entryName, fs.readFileSync(path.join(flowsDir, f)));
        }
      }
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
