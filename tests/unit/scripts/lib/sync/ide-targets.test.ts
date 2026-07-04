import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { listDeploymentAgentFiles } from '../../../../../scripts/lib/deployment-agents';
import { PackageError } from '../../../../../scripts/lib/errors';
import { Package } from '../../../../../scripts/lib/package';
import {
  syncCursorRules,
  syncCursorSkills,
  syncGithubCopilotAgents,
  syncIdeTargets,
  transformCopilotInstructionsToCursorRules,
} from '../../../../../scripts/lib/sync/ide-targets';
import { createDummyPackage } from '../../../../helpers/package-factory';

const tempDirs: string[] = [];

function makeRepoRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-ide-sync-'));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, 'packages'), { recursive: true });
  return dir;
}

afterEach((): void => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('listDeploymentAgentFiles', (): void => {
  it('flattens agents and flows with unique ids', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'sync-test', {
      agents: [{ id: 'alpha', name: 'alpha', description: 'Alpha agent for sync tests.' }],
      flows: [{ id: 'beta-flow', name: 'beta-flow', description: 'Beta flow for sync tests.' }],
    });

    const files = listDeploymentAgentFiles(path.join(repoRoot, 'packages', 'agents-repo', 'sync-test'));
    expect(files.map((file) => file.id)).toEqual(['alpha', 'beta-flow']);
  });

  it('throws on id collision between agents and flows', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'collision-test', {
      agents: [{ id: 'dup', name: 'dup', description: 'Duplicate id in agents.' }],
      flows: [{ id: 'dup', name: 'dup', description: 'Duplicate id in flows.' }],
    });

    expect(() => listDeploymentAgentFiles(packageDir)).toThrow(PackageError);
  });
});

describe('transformCopilotInstructionsToCursorRules', (): void => {
  it('wraps content with rule frontmatter and title transforms', (): void => {
    const source = [
      '# Copilot Agents Registry — Project Guidelines',
      '',
      '## Copilot Runtime Environment',
      '',
      'Copilot tasks in this repository MUST use the pinned runtime.',
    ].join('\n');

    const output = transformCopilotInstructionsToCursorRules(source);
    expect(output).toContain('alwaysApply: true');
    expect(output).toContain('# Agents Registry — Project Guidelines');
    expect(output).toContain('## Runtime Environment');
    expect(output).toContain('Agent tasks in this repository MUST use the pinned runtime.');
  });
});

describe('syncGithubCopilotAgents', (): void => {
  it('writes agent files and removes stale outputs', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'gh-sync', {
      agents: [{ id: 'keep-me', name: 'keep-me', description: 'Kept agent for github sync.' }],
      flows: [],
    });

    const stalePath = path.join(repoRoot, '.github', 'agents', 'stale.agent.md');
    fs.mkdirSync(path.dirname(stalePath), { recursive: true });
    fs.writeFileSync(stalePath, 'stale', 'utf-8');

    const pkg = new Package('agents-repo/gh-sync', path.join(repoRoot, 'packages'));
    const written = syncGithubCopilotAgents(repoRoot, pkg);

    expect(written).toEqual(['.github/agents/keep-me.agent.md']);
    expect(fs.existsSync(path.join(packageDir, 'agents', 'keep-me.agent.md'))).toBe(true);
    expect(fs.existsSync(stalePath)).toBe(false);
  });
});

describe('syncCursorSkills', (): void => {
  it('writes SKILL.md with converted frontmatter and version comment', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'cursor-sync', {
      agents: [{ id: 'skill-one', name: 'skill-one', description: 'Short desc.' }],
      flows: [],
    });

    const pkg = new Package('agents-repo/cursor-sync', path.join(repoRoot, 'packages'));
    const written = syncCursorSkills(repoRoot, pkg);
    const skillPath = path.join(repoRoot, written[0]);

    expect(skillPath.endsWith('.cursor/skills/skill-one/SKILL.md')).toBe(true);
    const content = fs.readFileSync(skillPath, 'utf-8');
    expect(content).toContain('name: skill-one');
    expect(content).toContain('Use when the user needs the skill-one workflow.');
    expect(content).toContain('<!-- agents-repo package version:');
  });
});

describe('syncCursorRules', (): void => {
  it('writes agents-registry.mdc from copilot instructions', (): void => {
    const repoRoot = makeRepoRoot();
    const sourcePath = path.join(repoRoot, '.github', 'copilot-instructions.md');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, '# Copilot Agents Registry — Project Guidelines\n', 'utf-8');

    const written = syncCursorRules(repoRoot);
    const content = fs.readFileSync(path.join(repoRoot, written), 'utf-8');
    expect(content).toContain('alwaysApply: true');
    expect(content).toContain('# Agents Registry — Project Guidelines');
  });
});

describe('syncIdeTargets', (): void => {
  it('runs all targets when target is all', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'all-sync', {
      agents: [{ id: 'all-agent', name: 'all-agent', description: 'Agent for all-target sync.' }],
      flows: [],
    });

    const sourcePath = path.join(repoRoot, '.github', 'copilot-instructions.md');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, '# Copilot Agents Registry — Project Guidelines\n', 'utf-8');

    const pkg = new Package('agents-repo/all-sync', path.join(repoRoot, 'packages'));
    const written = syncIdeTargets(repoRoot, pkg, 'all');

    expect(written.some((entry) => entry.endsWith('.github/agents/all-agent.agent.md'))).toBe(true);
    expect(written.some((entry) => entry.endsWith('.cursor/skills/all-agent/SKILL.md'))).toBe(true);
    expect(written.some((entry) => entry.endsWith('.cursor/rules/agents-registry.mdc'))).toBe(true);
  });
});
