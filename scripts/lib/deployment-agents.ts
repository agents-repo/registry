import fs from 'node:fs';
import path from 'node:path';
import { AGENT_FILE_EXT, AGENTS_DIR, FLOWS_DIR } from './constants';
import { ErrorCode, PackageError } from './errors';

export interface DeploymentAgentFile {
  id: string;
  content: string;
}

interface DeploymentAgentEntry {
  id: string;
  dirPath: string;
  fileName: string;
}

function collectAgentEntries(
  packageDir: string,
  dirName: string,
  seenIds: Set<string>,
): DeploymentAgentEntry[] {
  const dirPath = path.join(packageDir, dirName);
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries: DeploymentAgentEntry[] = [];
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
    entries.push({ id, dirPath, fileName });
  }

  return entries;
}

function collectAllAgentEntries(packageDir: string): DeploymentAgentEntry[] {
  const seenIds = new Set<string>();
  return [
    ...collectAgentEntries(packageDir, AGENTS_DIR, seenIds),
    ...collectAgentEntries(packageDir, FLOWS_DIR, seenIds),
  ];
}

export function listDeploymentAgentFileIds(packageDir: string): string[] {
  return collectAllAgentEntries(packageDir)
    .map((entry) => entry.id)
    .sort((left, right) => left.localeCompare(right));
}

export function listDeploymentAgentFiles(packageDir: string): DeploymentAgentFile[] {
  return collectAllAgentEntries(packageDir)
    .map((entry) => ({
      id: entry.id,
      content: fs.readFileSync(path.join(entry.dirPath, entry.fileName), 'utf-8'),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}
