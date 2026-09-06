import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AGENT_FILE_EXT, AGENTS_DIR, FLOWS_DIR } from '../../../../scripts/lib/constants';
import {
  listDeploymentAgentFileIds,
  listDeploymentAgentFiles,
} from '../../../../scripts/lib/deployment-agents';
import { ErrorCode, PackageError } from '../../../../scripts/lib/errors';

const createdDirs: string[] = [];

function makePackageDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-deployment-agents-'));
  createdDirs.push(dir);
  return dir;
}

function writeAgentFile(packageDir: string, dirName: string, id: string, content: string): void {
  const dirPath = path.join(packageDir, dirName);
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(path.join(dirPath, `${id}${AGENT_FILE_EXT}`), content, 'utf-8');
}

function expectZipCollision(run: (packageDir: string) => unknown): void {
  const packageDir = makePackageDir();
  writeAgentFile(packageDir, AGENTS_DIR, 'shared', 'agent-body');
  writeAgentFile(packageDir, FLOWS_DIR, 'shared', 'flow-body');

  try {
    run(packageDir);
    expect.unreachable();
  } catch (error) {
    expect(error).toBeInstanceOf(PackageError);
    expect((error as PackageError).code).toBe(ErrorCode.ERR_ZIP_COLLISION);
  }
}

afterEach((): void => {
  for (const dir of createdDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('listDeploymentAgentFileIds', (): void => {
  it('returns sorted agent and flow ids without reading bodies', (): void => {
    const packageDir = makePackageDir();
    writeAgentFile(packageDir, AGENTS_DIR, 'zebra', 'zebra-body');
    writeAgentFile(packageDir, AGENTS_DIR, 'alpha', 'alpha-body');
    writeAgentFile(packageDir, FLOWS_DIR, 'beta-flow', 'flow-body');
    fs.writeFileSync(path.join(packageDir, AGENTS_DIR, 'notes.txt'), 'skip', 'utf-8');

    expect(listDeploymentAgentFileIds(packageDir)).toEqual(['alpha', 'beta-flow', 'zebra']);
  });

  it('skips missing agents and flows directories', (): void => {
    const packageDir = makePackageDir();
    writeAgentFile(packageDir, AGENTS_DIR, 'only-agent', 'body');

    expect(listDeploymentAgentFileIds(packageDir)).toEqual(['only-agent']);
  });

  it('returns an empty list when neither directory exists', (): void => {
    expect(listDeploymentAgentFileIds(makePackageDir())).toEqual([]);
  });

  it('throws ERR_ZIP_COLLISION when an agent and flow share an id', (): void => {
    expectZipCollision(listDeploymentAgentFileIds);
  });
});

describe('listDeploymentAgentFiles', (): void => {
  it('returns sorted files with content from agents and flows', (): void => {
    const packageDir = makePackageDir();
    writeAgentFile(packageDir, AGENTS_DIR, 'zebra', 'zebra-body');
    writeAgentFile(packageDir, AGENTS_DIR, 'alpha', 'alpha-body');
    writeAgentFile(packageDir, FLOWS_DIR, 'beta-flow', 'flow-body');

    expect(listDeploymentAgentFiles(packageDir)).toEqual([
      { id: 'alpha', content: 'alpha-body' },
      { id: 'beta-flow', content: 'flow-body' },
      { id: 'zebra', content: 'zebra-body' },
    ]);
  });

  it('throws ERR_ZIP_COLLISION when an agent and flow share an id', (): void => {
    expectZipCollision(listDeploymentAgentFiles);
  });
});
