import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { METADATA_FILENAME } from '../constants';

export interface SmokeRunResult {
  workspaceDir: string;
  packagesDir: string;
  packageDir: string;
  version: string;
  deployZipPath: string;
  srcZipPath: string;
  manifestPath: string;
  indexPath: string;
}

export interface SmokeRunOptions {
  repoRoot?: string;
  workspaceDir?: string;
  cleanup?: boolean;
  log?: (message: string) => void;
}

function runScript(repoRoot: string, scriptName: string, args: string[], workspaceDir: string): void {
  const npmExecPath = process.env.npm_execpath?.trim();
  if (npmExecPath === undefined || npmExecPath.length === 0) {
    throw new Error('npm_execpath is not available for the smoke flow');
  }

  const result = spawnSync(process.execPath, [npmExecPath, 'run', scriptName, '--', ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      REGISTRY_REPO_ROOT: workspaceDir,
    },
    stdio: 'inherit',
  });

  if (result.error !== undefined) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Command failed: npm run ${scriptName} -- ${args.join(' ')}`);
  }
}

function readJsonValue(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
}

export async function runPackageCreateSmoke(
  packageId: string,
  options: SmokeRunOptions = {},
): Promise<SmokeRunResult> {
  const repoRoot = options.repoRoot ?? process.cwd();
  const workspaceDir = options.workspaceDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'registry-package-create-smoke-'));
  const cleanup = options.cleanup ?? false;
  const packagesDir = path.join(workspaceDir, 'packages');
  const packageDir = path.join(packagesDir, packageId);
  const metadataPath = path.join(packageDir, METADATA_FILENAME);
  const manifestPath = path.join(packageDir, 'versions', 'manifest.json');

  try {
    options.log?.(`[smoke] workspace: ${workspaceDir}`);

    runScript(repoRoot, 'package:create', [
      '--package', packageId,
      '--template', 'single-agent',
      '--description', `Smoke test package for ${packageId}`,
    ], workspaceDir);

    const metadata = readJsonValue(metadataPath) as { version?: string };
    const version = metadata.version;
    if (typeof version !== 'string' || version.length === 0) {
      throw new Error(`Smoke flow could not read a release version from ${METADATA_FILENAME}`);
    }

    runScript(repoRoot, 'package:validate', ['--package', packageId], workspaceDir);
    runScript(repoRoot, 'package:build', ['--package', packageId], workspaceDir);

    const manifest = readJsonValue(manifestPath) as { latest?: string };
    const latest = manifest.latest;
    if (typeof latest !== 'string' || latest.length === 0) {
      throw new Error(`Smoke flow could not read a release version from versions/manifest.json`);
    }

    if (latest !== version) {
      throw new Error(`Smoke flow version mismatch: metadata.json has ${version}, manifest latest is ${latest}`);
    }

    runScript(repoRoot, 'package:validate-artifacts', ['--package', packageId, '--version', latest], workspaceDir);

    return {
      workspaceDir,
      packagesDir,
      packageDir,
      version: latest,
      deployZipPath: path.join(packageDir, 'versions', latest, `${latest}.zip`),
      srcZipPath: path.join(packageDir, 'versions', latest, `${latest}-src.zip`),
      manifestPath,
      indexPath: path.join(workspaceDir, 'packages', 'index.json'),
    };
  } finally {
    if (cleanup) {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    }
  }
}
