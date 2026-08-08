#!/usr/bin/env node
/* eslint-disable security/detect-non-literal-fs-filename -- cache paths from pinned ACTIONLINT_VERSION and platform */
/* eslint-disable sonarjs/no-os-command-from-path -- PATH actionlint only as bootstrap fallback */
/* eslint-disable sonarjs/super-linear-regex -- version token parsed from actionlint -version stdout */
/* eslint-disable sonarjs/file-permissions -- chmod required for bootstrapped actionlint binary */
/* eslint-disable sonarjs/cognitive-complexity -- platform-specific release asset selection */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Pinned actionlint release — keep in sync across agents-repo org repositories. */
const ACTIONLINT_VERSION = '1.7.12';
const BOOTSTRAP_LOCK_WAIT_MS = 120_000;
const BOOTSTRAP_LOCK_POLL_MS = 200;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github', 'workflows');
const CACHE_ROOT = path.join(REPO_ROOT, '.cache', 'actionlint');
const BOOTSTRAP_LOCK_FILE = path.join(CACHE_ROOT, '.bootstrap.lock');

function sleepSync(ms) {
  const view = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(view, 0, 0, ms);
}

function cachedBinaryPath() {
  const versionDir = path.join(CACHE_ROOT, ACTIONLINT_VERSION);
  const binaryName = process.platform === 'win32' ? 'actionlint.exe' : 'actionlint';
  return path.join(versionDir, binaryName);
}

function readPathActionlintVersion() {
  try {
    const output = execFileSync('actionlint', ['-version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    const match = output.match(/(\d+\.\d+\.\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function releaseAssetName() {
  const version = ACTIONLINT_VERSION;
  const { platform, arch } = process;

  if (platform === 'linux') {
    if (arch === 'x64') return `actionlint_${version}_linux_amd64.tar.gz`;
    if (arch === 'arm64') return `actionlint_${version}_linux_arm64.tar.gz`;
  }
  if (platform === 'darwin') {
    if (arch === 'arm64') return `actionlint_${version}_darwin_arm64.tar.gz`;
    if (arch === 'x64') return `actionlint_${version}_darwin_amd64.tar.gz`;
  }
  if (platform === 'win32') {
    if (arch === 'x64') return `actionlint_${version}_windows_amd64.zip`;
    if (arch === 'ia32') return `actionlint_${version}_windows_386.zip`;
  }

  throw new Error(
    `Unsupported platform for actionlint bootstrap: ${platform} ${arch}. Install actionlint ${ACTIONLINT_VERSION} and ensure it is on PATH.`,
  );
}

function bootstrapFromRelease() {
  const asset = releaseAssetName();
  const versionDir = path.join(CACHE_ROOT, ACTIONLINT_VERSION);
  const binaryName = process.platform === 'win32' ? 'actionlint.exe' : 'actionlint';
  const binaryPath = path.join(versionDir, binaryName);

  fs.mkdirSync(versionDir, { recursive: true });
  const archivePath = path.join(versionDir, asset);
  const url = `https://github.com/rhysd/actionlint/releases/download/v${ACTIONLINT_VERSION}/${asset}`;

  try {
    execFileSync('curl', ['-fsSL', '-o', archivePath, url], { stdio: 'inherit' });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to download actionlint (requires curl). ${detail}`, { cause: error });
  }

  const stagingDir = fs.mkdtempSync(path.join(CACHE_ROOT, '.staging-'));
  try {
    try {
      if (asset.endsWith('.tar.gz')) {
        execFileSync('tar', ['-xzf', archivePath, '-C', stagingDir], { stdio: 'inherit' });
      } else if (asset.endsWith('.zip')) {
        execFileSync('unzip', ['-o', archivePath, '-d', stagingDir], { stdio: 'inherit' });
      } else {
        throw new Error(`Unknown archive type: ${asset}`);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to extract actionlint (requires tar or unzip). ${detail}`, {
        cause: error,
      });
    }

    fs.unlinkSync(archivePath);

    const extractedBinary = path.join(stagingDir, binaryName);
    if (!fs.existsSync(extractedBinary)) {
      throw new Error(`actionlint binary not found after extract: ${extractedBinary}`);
    }

    fs.renameSync(extractedBinary, binaryPath);
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }

  if (process.platform !== 'win32') {
    fs.chmodSync(binaryPath, 0o755);
  }

  return binaryPath;
}

function withBootstrapLock(install) {
  const existing = cachedBinaryPath();
  if (fs.existsSync(existing)) {
    return existing;
  }

  fs.mkdirSync(CACHE_ROOT, { recursive: true });
  const deadline = Date.now() + BOOTSTRAP_LOCK_WAIT_MS;
  let releaseLock = null;

  while (Date.now() < deadline) {
    const ready = cachedBinaryPath();
    if (fs.existsSync(ready)) {
      return ready;
    }

    try {
      const fd = fs.openSync(BOOTSTRAP_LOCK_FILE, 'wx');
      fs.closeSync(fd);
      releaseLock = () => {
        try {
          fs.unlinkSync(BOOTSTRAP_LOCK_FILE);
        } catch {
          /* ignore stale lock cleanup */
        }
      };
      break;
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      if (code !== 'EEXIST') {
        throw error;
      }
      sleepSync(BOOTSTRAP_LOCK_POLL_MS);
    }
  }

  if (!releaseLock) {
    throw new Error('Timed out waiting for actionlint bootstrap lock');
  }

  try {
    const ready = cachedBinaryPath();
    if (fs.existsSync(ready)) {
      return ready;
    }
    return install();
  } finally {
    releaseLock();
  }
}

function downloadAndExtract() {
  return withBootstrapLock(() => bootstrapFromRelease());
}

function resolveActionlintBinary() {
  const cached = cachedBinaryPath();
  if (fs.existsSync(cached)) {
    return cached;
  }

  const pathVersion = readPathActionlintVersion();
  if (pathVersion && pathVersion !== ACTIONLINT_VERSION) {
    console.warn(
      `actionlint on PATH is ${pathVersion}; expected ${ACTIONLINT_VERSION}. Using cached bootstrap.`,
    );
  }

  try {
    return downloadAndExtract();
  } catch (error) {
    if (pathVersion === ACTIONLINT_VERSION) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`actionlint bootstrap failed; using actionlint from PATH. ${detail}`);
      return 'actionlint';
    }
    throw error;
  }
}

function workflowsPresent() {
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    return false;
  }
  return fs.readdirSync(WORKFLOWS_DIR).some((name) => name.endsWith('.yml') || name.endsWith('.yaml'));
}

function main() {
  if (!workflowsPresent()) {
    console.log('No .github/workflows YAML files; skipping actionlint.');
    return;
  }

  const binary = resolveActionlintBinary();
  const result = spawnSync(binary, ['-color'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: { ...process.env },
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

main();
