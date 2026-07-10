import fs from 'node:fs';
import path from 'node:path';
import { AGENT_FILE_EXT, AGENTS_DIR, FLOWS_DIR } from './constants';
import { ErrorCode, PackageError } from './errors';

export interface DeploymentAgentFile {
  id: string;
  content: string;
}

function collectIdsFromDir(
  packageDir: string,
  dirName: string,
  seenIds: Set<string>,
  ids: string[],
): void {
  const dirPath = path.join(packageDir, dirName);
  if (!fs.existsSync(dirPath)) {
    return;
  }

  for (const fileName of fs.readdirSync(dirPath)) {
    if (!fileName.endsWith(AGENT_FILE_EXT)) {
      continue;
    }

    const id = fileName.slice(0, -AGENT_FILE_EXT.length);
    if (seenIds.has(id)) {
      throw new PackageError(
        ErrorCode.ERR_ZIP_COLLISION,
        `Collision building deployment listing: "${dirName}/${fileName}" conflicts with an existing agent or flow id`,
      );
    }

    seenIds.add(id);
    ids.push(id);
  }
}

function collectFromDir(
  packageDir: string,
  dirName: string,
  seenIds: Set<string>,
  files: DeploymentAgentFile[],
): void {
  const dirPath = path.join(packageDir, dirName);
  if (!fs.existsSync(dirPath)) {
    return;
  }

  for (const fileName of fs.readdirSync(dirPath)) {
    if (!fileName.endsWith(AGENT_FILE_EXT)) {
      continue;
    }

    const id = fileName.slice(0, -AGENT_FILE_EXT.length);
    if (seenIds.has(id)) {
      throw new PackageError(
        ErrorCode.ERR_ZIP_COLLISION,
        `Collision building deployment listing: "${dirName}/${fileName}" conflicts with an existing agent or flow id`,
      );
    }

    seenIds.add(id);
    files.push({
      id,
      content: fs.readFileSync(path.join(dirPath, fileName), 'utf-8'),
    });
  }
}

export function listDeploymentAgentFileIds(packageDir: string): string[] {
  const seenIds = new Set<string>();
  const ids: string[] = [];

  collectIdsFromDir(packageDir, AGENTS_DIR, seenIds, ids);
  collectIdsFromDir(packageDir, FLOWS_DIR, seenIds, ids);

  return ids.sort((left, right) => left.localeCompare(right));
}

export function listDeploymentAgentFiles(packageDir: string): DeploymentAgentFile[] {
  const seenIds = new Set<string>();
  const files: DeploymentAgentFile[] = [];

  collectFromDir(packageDir, AGENTS_DIR, seenIds, files);
  collectFromDir(packageDir, FLOWS_DIR, seenIds, files);

  return files.sort((left, right) => left.id.localeCompare(right.id));
}
