import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { parseFrontmatter } from './frontmatter';

export class ZipBuilder {
  private readonly packageDir: string;
  private readonly version: string;

  constructor(packageDir: string, version: string) {
    this.packageDir = packageDir;
    this.version = version;
  }

  buildDeploymentZip(outputPath: string): void {
    const zip = new AdmZip();

    const addAgentMd = (srcPath: string, entryName: string): void => {
      let content = fs.readFileSync(srcPath, 'utf-8');
      const fm = parseFrontmatter(content);
      if (fm['version'] !== this.version) {
        content = content.replace(
          /^(---\r?\n[\s\S]*?version:\s*)([^\r\n]+)/m,
          `$1${this.version}`,
        );
      }
      zip.addFile(entryName, Buffer.from(content, 'utf-8'));
    };

    const agentsDir = path.join(this.packageDir, 'agents');
    if (fs.existsSync(agentsDir)) {
      for (const f of fs.readdirSync(agentsDir)) {
        if (f.endsWith('.agent.md')) {
          addAgentMd(path.join(agentsDir, f), `agents/${f}`);
        }
      }
    }

    const flowsDir = path.join(this.packageDir, 'flows');
    if (fs.existsSync(flowsDir)) {
      for (const f of fs.readdirSync(flowsDir)) {
        if (f.endsWith('.agent.md')) {
          // Flows are merged into agents/ in the deployment ZIP
          addAgentMd(path.join(flowsDir, f), `agents/${f}`);
        }
      }
    }

    zip.writeZip(outputPath);
  }

  buildSourceZip(outputPath: string): void {
    const zip = new AdmZip();

    const addDir = (dir: string, prefix: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'versions') continue;
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
