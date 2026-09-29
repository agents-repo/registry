import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

const GENERATED_FROM_CURSOR =
  '<!-- Generated: .cursor/rules/agents-registry.mdc. Run npm run sync:ide-instructions -->';

function makeTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-ide-sync-'));
  fs.mkdirSync(path.join(dir, '.cursor', 'rules'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.github'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  fs.copyFileSync(
    path.join(REPO_ROOT, 'scripts', 'sync-ide-instructions.mjs'),
    path.join(dir, 'scripts', 'sync-ide-instructions.mjs'),
  );
  return dir;
}

function writeCanonical(repo, body) {
  const content = [
    '---',
    'description: Test guidelines',
    'alwaysApply: true',
    '---',
    '',
    body,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(repo, '.cursor', 'rules', 'agents-registry.mdc'), content, 'utf-8');
}

const tempRepos = [];

afterEach(() => {
  while (tempRepos.length > 0) {
    fs.rmSync(tempRepos.pop(), { recursive: true, force: true });
  }
});

describe('sync-ide-instructions', () => {
  it('writes copilot, claude, and codex mirrors from cursor source', async () => {
    const repo = makeTempRepo();
    tempRepos.push(repo);
    writeCanonical(repo, '# Project Guidelines\n');

    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);
    await execFileAsync('node', ['scripts/sync-ide-instructions.mjs'], { cwd: repo });

    const copilotOutput = fs.readFileSync(
      path.join(repo, '.github', 'copilot-instructions.md'),
      'utf-8',
    );
    assert.match(copilotOutput, /Generated: \.cursor\/rules\/agents-registry\.mdc/);
    assert.ok(fs.readFileSync(path.join(repo, 'CLAUDE.md'), 'utf-8').includes(GENERATED_FROM_CURSOR));
  });

  it('exits non-zero on drift when --check', async () => {
    const repo = makeTempRepo();
    tempRepos.push(repo);
    writeCanonical(repo, '# Source\n');
    fs.writeFileSync(path.join(repo, '.github', 'copilot-instructions.md'), 'stale\n', 'utf-8');

    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);
    await assert.rejects(
      () => execFileAsync('node', ['scripts/sync-ide-instructions.mjs', '--check'], { cwd: repo }),
      (error) => error.code === 1,
    );
  });
});
