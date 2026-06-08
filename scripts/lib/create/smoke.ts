import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { parseReleaseVersion } from '../cli';
import { METADATA_FILENAME } from '../constants';

export interface SmokeRunResult {
  workspaceDir: string;
  packagesDir: string;
  packageDir: string;
  version: string;
  targetArtifactPaths: string[];
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
  let npmCommand = 'npm';
  if (os.platform() === 'win32') {
    npmCommand = 'npm.cmd';
  }

  if (npmExecPath !== undefined && npmExecPath.length > 0) {
    npmCommand = process.execPath;
  }

  const npmArgs = npmExecPath !== undefined && npmExecPath.length > 0
    ? [npmExecPath, 'run', scriptName, '--', ...args]
    : ['run', scriptName, '--', ...args];

  const result = spawnSync(npmCommand, npmArgs, {
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
    throw new Error(
      `Command failed (status: ${result.status}, signal: ${result.signal}): npm run ${scriptName} -- ${args.join(' ')}`,
    );
  }
}

function readJsonValue(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
}

function readRequiredReleaseVersion(sourceLabel: string, value: unknown): string {
  const version = parseReleaseVersion(value);
  if (version === null) {
    throw new Error(
      `Smoke flow expected ${sourceLabel} to contain a MAJOR.MINOR.PATCH release version, got: ${JSON.stringify(value)}`,
    );
  }

  return version;
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

    const metadata = readJsonValue(metadataPath) as { version?: unknown };
    const version = readRequiredReleaseVersion(`${METADATA_FILENAME} version`, metadata.version);

    runScript(repoRoot, 'package:validate', ['--package', packageId], workspaceDir);
    runScript(repoRoot, 'package:build', ['--package', packageId], workspaceDir);

    const manifest = readJsonValue(manifestPath) as { latest?: unknown };
    const latest = readRequiredReleaseVersion('versions/manifest.json latest', manifest.latest);

    if (latest !== version) {
      throw new Error(`Smoke flow version mismatch: metadata.json has ${version}, manifest latest is ${latest}`);
    }

    runScript(repoRoot, 'package:validate-artifacts', ['--package', packageId, '--version', latest], workspaceDir);

    const versionDir = path.join(packageDir, 'versions', latest);
    const targetArtifactPaths = fs.readdirSync(versionDir).filter((entry) => entry.endsWith('.zip') && !entry.endsWith('-src.zip'));

    return {
      workspaceDir,
      packagesDir,
      packageDir,
      version: latest,
      targetArtifactPaths: targetArtifactPaths.map((entry) => path.join(versionDir, entry)),
      srcZipPath: path.join(versionDir, `${latest}-src.zip`),
      manifestPath,
      indexPath: path.join(workspaceDir, 'packages', 'index.json'),
    };
  } finally {
    if (cleanup) {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    }
  }
}
