#!/usr/bin/env node
/* eslint-disable security/detect-non-literal-fs-filename -- cache paths from pinned ACTIONLINT_VERSION and platform */
/* eslint-disable sonarjs/cognitive-complexity -- platform-specific release asset selection */
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Pinned actionlint release — keep in sync across agents-repo org repositories. */
const ACTIONLINT_VERSION = '1.7.12';
const BOOTSTRAP_LOCK_WAIT_MS = 120_000;
/** Stale lock removal must exceed max bootstrap wait so active installs are not interrupted. */
const BOOTSTRAP_LOCK_STALE_MS = 600_000;
const BOOTSTRAP_LOCK_POLL_MS = 200;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github', 'workflows');
const CACHE_ROOT = path.join(REPO_ROOT, '.cache', 'actionlint');
const BOOTSTRAP_LOCK_FILE = path.join(CACHE_ROOT, '.bootstrap.lock');

/** OS-managed binary locations — excludes /usr/local, which is often user-writable. */
const TRUSTED_PATH_DIRS =
  process.platform === 'win32'
    ? ['C:\\Windows\\System32', 'C:\\Windows']
    : ['/usr/sbin', '/usr/bin', '/sbin', '/bin'];

function trustedPathValue() {
  return TRUSTED_PATH_DIRS.join(process.platform === 'win32' ? ';' : ':');
}

function trustedEnv() {
  return { ...process.env, PATH: trustedPathValue() };
}

function resolveTrustedExecutable(commandName) {
  const fileName =
    process.platform === 'win32' && !commandName.toLowerCase().endsWith('.exe')
      ? `${commandName}.exe`
      : commandName;
  for (const directory of TRUSTED_PATH_DIRS) {
    const candidate = path.join(directory, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `Required executable "${commandName}" was not found under trusted system directories.`,
  );
}

function execTrusted(commandName, args, options = {}) {
  const executable = resolveTrustedExecutable(commandName);
  return execFileSync(executable, args, { ...options, env: trustedEnv() });
}

function parseSemverToken(stdout) {
  for (const token of stdout.split(/\s+/)) {
    if (/^\d{1,20}\.\d{1,20}\.\d{1,20}$/.test(token)) {
      return token;
    }
  }
  return null;
}

function sleepSync(ms) {
  const view = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(view, 0, 0, ms);
}

function cachedBinaryPath() {
  const versionDir = path.join(CACHE_ROOT, ACTIONLINT_VERSION);
  const binaryName = process.platform === 'win32' ? 'actionlint.exe' : 'actionlint';
  return path.join(versionDir, binaryName);
}

function removeStaleBootstrapLockIfNeeded() {
  if (!fs.existsSync(BOOTSTRAP_LOCK_FILE)) {
    return;
  }
  try {
    const { mtimeMs } = fs.statSync(BOOTSTRAP_LOCK_FILE);
    if (Date.now() - mtimeMs > BOOTSTRAP_LOCK_STALE_MS) {
      fs.unlinkSync(BOOTSTRAP_LOCK_FILE);
    }
  } catch {
    /* ignore lock stat/unlink errors */
  }
}

function readPathActionlintVersion() {
  try {
    const output = execTrusted('actionlint', ['-version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return parseSemverToken(output);
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

function expectedArchiveSha256(asset) {
  const checksumsUrl = `https://github.com/rhysd/actionlint/releases/download/v${ACTIONLINT_VERSION}/actionlint_${ACTIONLINT_VERSION}_checksums.txt`;
  let checksumsBody;
  try {
    checksumsBody = execTrusted('curl', ['-fsSL', checksumsUrl], { encoding: 'utf8' });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to download actionlint checksums (requires curl). ${detail}`, {
      cause: error,
    });
  }

  for (const line of checksumsBody.split('\n')) {
    const match = line.match(/^([a-f0-9]{64})\s{2}(.+)$/);
    if (match && match[2] === asset) {
      return match[1];
    }
  }

  throw new Error(`Checksum for ${asset} not found in actionlint release checksums file`);
}

function verifyArchiveSha256(archivePath, asset) {
  const expected = expectedArchiveSha256(asset);
  const actual = createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex');
  if (actual !== expected) {
    throw new Error(
      `actionlint archive checksum mismatch for ${asset}: expected ${expected}, got ${actual}`,
    );
  }
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
    execTrusted('curl', ['-fsSL', '-o', archivePath, url], { stdio: 'inherit' });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to download actionlint (requires curl). ${detail}`, { cause: error });
  }

  verifyArchiveSha256(archivePath, asset);

  const stagingDir = fs.mkdtempSync(path.join(CACHE_ROOT, '.staging-'));
  try {
    try {
      if (asset.endsWith('.tar.gz')) {
        execTrusted('tar', ['-xzf', archivePath, '-C', stagingDir], { stdio: 'inherit' });
      } else if (asset.endsWith('.zip')) {
        // Windows release assets are .zip; tar.exe is bundled with Windows 10+.
        execTrusted('tar', ['-xf', archivePath, '-C', stagingDir], { stdio: 'inherit' });
      } else {
        throw new Error(`Unknown archive type: ${asset}`);
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to extract actionlint (requires tar). ${detail}`, {
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
    fs.chmodSync(binaryPath, 0o750);
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

    removeStaleBootstrapLockIfNeeded();

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
      removeStaleBootstrapLockIfNeeded();
      sleepSync(BOOTSTRAP_LOCK_POLL_MS);
    }
  }

  if (!releaseLock) {
    throw new Error(
      `Timed out after ${BOOTSTRAP_LOCK_WAIT_MS}ms waiting for actionlint bootstrap lock at ${BOOTSTRAP_LOCK_FILE}. ` +
        'If no other process is installing actionlint, remove the stale lock file and retry.',
    );
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
      `actionlint on PATH is ${pathVersion}; expected ${ACTIONLINT_VERSION}. Bootstrapping pinned release instead.`,
    );
  }

  try {
    return downloadAndExtract();
  } catch (error) {
    if (pathVersion === ACTIONLINT_VERSION) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`actionlint bootstrap failed; using actionlint from PATH. ${detail}`);
      return resolveTrustedExecutable('actionlint');
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

function listWorkflowFiles() {
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .map((name) => path.join(WORKFLOWS_DIR, name));
}

function main() {
  if (!workflowsPresent()) {
    console.log('No .github/workflows YAML files; skipping actionlint.');
    return;
  }

  const binary = resolveActionlintBinary();
  const workflowFiles = listWorkflowFiles();
  const executable = path.isAbsolute(binary) ? binary : resolveTrustedExecutable(binary);
  const result = spawnSync(executable, ['-color', ...workflowFiles], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: trustedEnv(),
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

main();
