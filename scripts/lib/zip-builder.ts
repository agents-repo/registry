import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { DETAIL_FILENAME, VERSIONS_DIR } from './constants';
import { listAgentInstructionFiles } from './emitters/agent-instruction';
import {
  createDeploymentTransformContext,
  transformAgentMdForDeployment,
} from './emitters/deployment-transform';
import { copilotAgentZipEntry, packageRefFromDir } from './install-leaf';
import type { PackageRef } from './namespace';
import { addDeterministicZipEntry } from './deterministic-zip';

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
  private readonly ref: PackageRef;

  constructor(packageDir: string, version: string, ref?: PackageRef) {
    this.packageDir = packageDir;
    this.version = version;
    this.ref = ref ?? packageRefFromDir(packageDir);
  }

  buildDeploymentZip(outputPath: string): void {
    const files = listAgentInstructionFiles(this.packageDir);
    const context = createDeploymentTransformContext(
      this.ref.namespace,
      this.ref.packageId,
      files,
    );
    const zip = new AdmZip(ZIP_WRITE_OPTIONS);

    for (const file of files) {
      const installLeaf = context.installLeafBySourceId.get(file.id)!;
      const transformed = transformAgentMdForDeployment(file.content, file, context);
      addDeterministicZipEntry(
        zip,
        copilotAgentZipEntry(installLeaf),
        transformed,
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
        if (entry.name === VERSIONS_DIR || entry.name === DETAIL_FILENAME) continue;
        const fullPath = path.join(dir, entry.name);
        const zipName = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          addDir(fullPath, zipName);
        } else {
          addDeterministicZipEntry(zip, zipName, fs.readFileSync(fullPath));
        }
      }
    };

    addDir(this.packageDir, '');
    zip.writeZip(outputPath);
  }
}
