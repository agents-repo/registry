import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { listDeploymentAgentFiles } from '../../../../../scripts/lib/deployment-agents';
import { PackageError } from '../../../../../scripts/lib/errors';
import { Package } from '../../../../../scripts/lib/package';
import {
  checkIdeTargets,
  syncClaudeCodeAgents,
  syncCursorRules,
  syncCursorSkills,
  syncGithubCopilotAgents,
  syncIdeTargets,
  syncOpenaiCodexSkills,
  transformCopilotInstructionsToCursorRules,
  validateRepoDogfoodingConfig,
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

  it('transforms every repeated phrase occurrence', (): void => {
    const source = [
      'Copilot tasks in this repository do one thing.',
      'Copilot tasks in this repository do another.',
    ].join('\n');

    const output = transformCopilotInstructionsToCursorRules(source);
    expect(output).not.toContain('Copilot tasks in this repository');
    expect(output.match(/Agent tasks in this repository/g)?.length).toBe(2);
  });

  it('rewrites relative markdown links for the mirror directory depth', (): void => {
    const source = [
      'Read [../README.md](../README.md).',
      'Read [CONTRIBUTING.md](CONTRIBUTING.md).',
    ].join('\n');

    const output = transformCopilotInstructionsToCursorRules(source);
    expect(output).toContain('[../../README.md](../../README.md)');
    expect(output).toContain('[../../.github/CONTRIBUTING.md](../../.github/CONTRIBUTING.md)');
  });

  it('rewrites titled markdown links while preserving the title suffix', (): void => {
    const source = 'Read [../README.md](../README.md "Repo readme").';
    const output = transformCopilotInstructionsToCursorRules(source);
    expect(output).toContain('[../../README.md](../../README.md "Repo readme")');
  });
});

describe('validateRepoDogfoodingConfig', (): void => {
  it('accepts the committed dogfooding configuration', (): void => {
    expect(() => validateRepoDogfoodingConfig()).not.toThrow();
  });
});

describe('syncGithubCopilotAgents metadata errors', (): void => {
  it('propagates metadata load errors when syncing a dogfooded package', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'agents-repo-package-creation', {
      namespace: 'agents-repo',
      agents: [{ id: 'pkg-a-agent', name: 'pkg-a-agent', description: 'Agent from package A.' }],
      flows: [],
    });
    fs.writeFileSync(path.join(packageDir, 'metadata.json'), '{invalid json', 'utf-8');

    const pkg = new Package('agents-repo/agents-repo-package-creation', path.join(repoRoot, 'packages'));
    expect(() => syncGithubCopilotAgents(repoRoot, pkg)).toThrow(SyntaxError);
  });
});

describe('syncGithubCopilotAgents', (): void => {
  it('preserves mirrors from other dogfooded packages when syncing one package', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'agents-repo-package-creation', {
      namespace: 'agents-repo',
      agents: [{ id: 'pkg-a-agent', name: 'pkg-a-agent', description: 'Agent from package A.' }],
      flows: [],
    });
    createDummyPackage(repoRoot, 'pr-comment-triage', {
      namespace: 'maiconfz',
      agents: [{ id: 'pkg-b-agent', name: 'pkg-b-agent', description: 'Agent from package B.' }],
      flows: [],
    });

    const pkgA = new Package('agents-repo/agents-repo-package-creation', path.join(repoRoot, 'packages'));
    const pkgB = new Package('maiconfz/pr-comment-triage', path.join(repoRoot, 'packages'));

    syncGithubCopilotAgents(repoRoot, pkgA);
    syncGithubCopilotAgents(repoRoot, pkgB);

    expect(fs.existsSync(path.join(repoRoot, '.github', 'agents', 'pkg-a-agent.agent.md'))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, '.github', 'agents', 'pkg-b-agent.agent.md'))).toBe(true);

    syncGithubCopilotAgents(repoRoot, pkgB);

    expect(fs.existsSync(path.join(repoRoot, '.github', 'agents', 'pkg-a-agent.agent.md'))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, '.github', 'agents', 'pkg-b-agent.agent.md'))).toBe(true);
  });

  it('preserves sibling dogfooded mirrors when metadata no longer declares the install target', (): void => {
    const repoRoot = makeRepoRoot();
    const packageBDir = createDummyPackage(repoRoot, 'pr-comment-triage', {
      namespace: 'maiconfz',
      agents: [{ id: 'pkg-b-agent', name: 'pkg-b-agent', description: 'Agent from package B.' }],
      flows: [],
    });
    createDummyPackage(repoRoot, 'agents-repo-package-creation', {
      namespace: 'agents-repo',
      agents: [{ id: 'pkg-a-agent', name: 'pkg-a-agent', description: 'Agent from package A.' }],
      flows: [],
    });

    const pkgA = new Package('agents-repo/agents-repo-package-creation', path.join(repoRoot, 'packages'));
    const pkgB = new Package('maiconfz/pr-comment-triage', path.join(repoRoot, 'packages'));

    syncGithubCopilotAgents(repoRoot, pkgA);
    syncGithubCopilotAgents(repoRoot, pkgB);

    const metadataPath = path.join(packageBDir, 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as Record<string, unknown>;
    metadata.compatibility = {
      canonicalFormat: 'agents-repo.agent-instruction@1.0.0',
      targets: [{ id: 'cursor', status: 'supported' }],
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    syncGithubCopilotAgents(repoRoot, pkgA);

    expect(fs.existsSync(path.join(repoRoot, '.github', 'agents', 'pkg-a-agent.agent.md'))).toBe(true);
    expect(fs.existsSync(path.join(repoRoot, '.github', 'agents', 'pkg-b-agent.agent.md'))).toBe(true);
  });

  it('writes agent files and removes stale outputs', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'gh-sync', {
      agents: [{ id: 'keep-me', name: 'keep-me', description: 'Kept agent for github sync.' }],
      flows: [],
    });

    const stalePath = path.join(repoRoot, '.github', 'agents', 'stale.agent.md');
    fs.mkdirSync(path.dirname(stalePath), { recursive: true });
    fs.writeFileSync(stalePath, 'stale', 'utf-8');

    const pkg = new Package('agents-repo/gh-sync', path.join(repoRoot, 'packages'));
    const written = syncGithubCopilotAgents(repoRoot, pkg);

    expect(written).toEqual(['.github/agents/keep-me.agent.md']);
    expect(fs.existsSync(path.join(repoRoot, '.github', 'agents', 'keep-me.agent.md'))).toBe(true);
    expect(fs.existsSync(stalePath)).toBe(false);
  });

  it('skips directory entries that look like stale GitHub agent files', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'gh-dir-sync', {
      agents: [{ id: 'keep-me', name: 'keep-me', description: 'Kept agent for github sync.' }],
      flows: [],
    });

    const bogusDir = path.join(repoRoot, '.github', 'agents', 'stale.agent.md');
    fs.mkdirSync(bogusDir, { recursive: true });

    const pkg = new Package('agents-repo/gh-dir-sync', path.join(repoRoot, 'packages'));
    expect(() => syncGithubCopilotAgents(repoRoot, pkg)).not.toThrow();
    expect(fs.existsSync(bogusDir)).toBe(true);
    expect(checkIdeTargets(repoRoot, pkg, 'github-copilot')).toEqual([]);
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

  it('removes stale skill directories when agent ids change', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'cursor-stale', {
      agents: [{ id: 'current-skill', name: 'current-skill', description: 'Current skill after stale cleanup.' }],
      flows: [],
    });

    const staleSkillDir = path.join(repoRoot, '.cursor', 'skills', 'stale-skill');
    fs.mkdirSync(staleSkillDir, { recursive: true });
    fs.writeFileSync(path.join(staleSkillDir, 'SKILL.md'), 'stale', 'utf-8');

    const pkg = new Package('agents-repo/cursor-stale', path.join(repoRoot, 'packages'));
    syncCursorSkills(repoRoot, pkg);

    expect(fs.existsSync(staleSkillDir)).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, '.cursor', 'skills', 'current-skill', 'SKILL.md'))).toBe(true);
  });
});

describe('syncClaudeCodeAgents', (): void => {
  it('writes .md agent files and removes stale outputs', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'claude-sync', {
      agents: [{ id: 'claude-agent', name: 'claude-agent', description: 'Claude agent for sync tests.' }],
      flows: [],
    });

    const stalePath = path.join(repoRoot, '.claude', 'agents', 'stale.md');
    fs.mkdirSync(path.dirname(stalePath), { recursive: true });
    fs.writeFileSync(stalePath, 'stale', 'utf-8');

    const pkg = new Package('agents-repo/claude-sync', path.join(repoRoot, 'packages'));
    const written = syncClaudeCodeAgents(repoRoot, pkg);

    expect(written).toEqual(['.claude/agents/claude-agent.md']);
    expect(fs.existsSync(path.join(repoRoot, '.claude', 'agents', 'claude-agent.md'))).toBe(true);
    expect(fs.existsSync(stalePath)).toBe(false);
  });

  it('does not remove hand-authored non-agent markdown files from Claude agents directory', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'claude-notes', {
      agents: [{ id: 'claude-agent', name: 'claude-agent', description: 'Claude agent for sync tests.' }],
      flows: [],
    });

    const notesPath = path.join(repoRoot, '.claude', 'agents', 'NOTES.md');
    fs.mkdirSync(path.dirname(notesPath), { recursive: true });
    fs.writeFileSync(notesPath, 'hand-authored notes', 'utf-8');

    const pkg = new Package('agents-repo/claude-notes', path.join(repoRoot, 'packages'));
    syncClaudeCodeAgents(repoRoot, pkg);

    expect(fs.existsSync(notesPath)).toBe(true);
  });

  it('skips directory entries that look like managed Claude agent files during stale cleanup', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'claude-dir-sync', {
      agents: [{ id: 'claude-agent', name: 'claude-agent', description: 'Claude agent for sync tests.' }],
      flows: [],
    });

    const bogusDir = path.join(repoRoot, '.claude', 'agents', 'stale-agent.md');
    fs.mkdirSync(bogusDir, { recursive: true });

    const pkg = new Package('agents-repo/claude-dir-sync', path.join(repoRoot, 'packages'));
    expect(() => syncClaudeCodeAgents(repoRoot, pkg)).not.toThrow();
    expect(fs.existsSync(bogusDir)).toBe(true);
  });

  it('rejects Claude sync for dogfooded packages outside repository target scope', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'pr-comment-triage', {
      namespace: 'maiconfz',
      agents: [{ id: 'pkg-b-agent', name: 'pkg-b-agent', description: 'Agent from package B.' }],
      flows: [],
    });

    const pkgB = new Package('maiconfz/pr-comment-triage', path.join(repoRoot, 'packages'));
    expect(() => syncClaudeCodeAgents(repoRoot, pkgB)).toThrow(
      /not in repository dogfooding scope for install target "claude-code"/,
    );
  });

  it('removes out-of-scope Claude mirrors when resyncing an in-scope package', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'agents-repo-package-creation', {
      namespace: 'agents-repo',
      agents: [{ id: 'pkg-a-agent', name: 'pkg-a-agent', description: 'Agent from package A.' }],
      flows: [],
    });

    const pkgA = new Package('agents-repo/agents-repo-package-creation', path.join(repoRoot, 'packages'));

    syncClaudeCodeAgents(repoRoot, pkgA);

    const outOfScopePath = path.join(repoRoot, '.claude', 'agents', 'pkg-b-agent.md');
    fs.mkdirSync(path.dirname(outOfScopePath), { recursive: true });
    fs.writeFileSync(outOfScopePath, 'out of scope mirror', 'utf-8');

    expect(fs.existsSync(path.join(repoRoot, '.claude', 'agents', 'pkg-a-agent.md'))).toBe(true);
    expect(fs.existsSync(outOfScopePath)).toBe(true);

    syncClaudeCodeAgents(repoRoot, pkgA);

    expect(fs.existsSync(path.join(repoRoot, '.claude', 'agents', 'pkg-a-agent.md'))).toBe(true);
    expect(fs.existsSync(outOfScopePath)).toBe(false);
  });
});

describe('syncOpenaiCodexSkills', (): void => {
  it('writes SKILL.md with converted frontmatter and version comment', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'codex-sync', {
      agents: [{ id: 'codex-skill', name: 'codex-skill', description: 'Short desc.' }],
      flows: [],
    });

    const pkg = new Package('agents-repo/codex-sync', path.join(repoRoot, 'packages'));
    const written = syncOpenaiCodexSkills(repoRoot, pkg);
    const skillPath = path.join(repoRoot, written[0]);

    expect(skillPath.endsWith('.agents/skills/codex-skill/SKILL.md')).toBe(true);
    const content = fs.readFileSync(skillPath, 'utf-8');
    expect(content).toContain('name: codex-skill');
    expect(content).toContain('Use when the user needs the codex-skill workflow.');
    expect(content).toContain('<!-- agents-repo package version:');
  });

  it('removes stale skill directories when agent ids change', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'codex-stale', {
      agents: [{ id: 'current-skill', name: 'current-skill', description: 'Current skill after stale cleanup.' }],
      flows: [],
    });

    const staleSkillDir = path.join(repoRoot, '.agents', 'skills', 'stale-skill');
    fs.mkdirSync(staleSkillDir, { recursive: true });
    fs.writeFileSync(path.join(staleSkillDir, 'SKILL.md'), 'stale', 'utf-8');

    const pkg = new Package('agents-repo/codex-stale', path.join(repoRoot, 'packages'));
    syncOpenaiCodexSkills(repoRoot, pkg);

    expect(fs.existsSync(staleSkillDir)).toBe(false);
    expect(fs.existsSync(path.join(repoRoot, '.agents', 'skills', 'current-skill', 'SKILL.md'))).toBe(true);
  });

  it('does not remove hand-authored non-skill directories from Codex skills root', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'codex-notes', {
      agents: [{ id: 'codex-skill', name: 'codex-skill', description: 'Short desc.' }],
      flows: [],
    });

    const notesDir = path.join(repoRoot, '.agents', 'skills', '_scratch');
    fs.mkdirSync(notesDir, { recursive: true });
    fs.writeFileSync(path.join(notesDir, 'NOTES.md'), 'hand-authored notes', 'utf-8');

    const pkg = new Package('agents-repo/codex-notes', path.join(repoRoot, 'packages'));
    syncOpenaiCodexSkills(repoRoot, pkg);

    expect(fs.existsSync(notesDir)).toBe(true);
  });

  it('reports OpenAI Codex-specific error when metadata.version is missing', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'agents-repo-package-creation', {
      namespace: 'agents-repo',
      agents: [{ id: 'pkg-a-agent', name: 'pkg-a-agent', description: 'Agent from package A.' }],
      flows: [],
    });

    const metadataPath = path.join(packageDir, 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as Record<string, unknown>;
    delete metadata.version;
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    const pkg = new Package('agents-repo/agents-repo-package-creation', path.join(repoRoot, 'packages'));
    expect(() => syncOpenaiCodexSkills(repoRoot, pkg)).toThrow(
      /metadata\.json version is required for OpenAI Codex skill sync/,
    );
  });

  it('rejects Codex sync for dogfooded packages outside repository target scope', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'pr-comment-triage', {
      namespace: 'maiconfz',
      agents: [{ id: 'pkg-b-agent', name: 'pkg-b-agent', description: 'Agent from package B.' }],
      flows: [],
    });

    const pkgB = new Package('maiconfz/pr-comment-triage', path.join(repoRoot, 'packages'));
    expect(() => syncOpenaiCodexSkills(repoRoot, pkgB)).toThrow(
      /not in repository dogfooding scope for install target "openai-codex"/,
    );
  });

  it('removes out-of-scope Codex mirrors when resyncing an in-scope package', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'agents-repo-package-creation', {
      namespace: 'agents-repo',
      agents: [{ id: 'pkg-a-agent', name: 'pkg-a-agent', description: 'Agent from package A.' }],
      flows: [],
    });

    const pkgA = new Package('agents-repo/agents-repo-package-creation', path.join(repoRoot, 'packages'));

    syncOpenaiCodexSkills(repoRoot, pkgA);

    const outOfScopeDir = path.join(repoRoot, '.agents', 'skills', 'pkg-b-agent');
    fs.mkdirSync(outOfScopeDir, { recursive: true });
    fs.writeFileSync(path.join(outOfScopeDir, 'SKILL.md'), 'out of scope mirror', 'utf-8');

    expect(fs.existsSync(path.join(repoRoot, '.agents', 'skills', 'pkg-a-agent', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(outOfScopeDir, 'SKILL.md'))).toBe(true);

    syncOpenaiCodexSkills(repoRoot, pkgA);

    expect(fs.existsSync(path.join(repoRoot, '.agents', 'skills', 'pkg-a-agent', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(outOfScopeDir, 'SKILL.md'))).toBe(false);
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

  it('removes stale generated cursor rules but keeps hand-authored rules', (): void => {
    const repoRoot = makeRepoRoot();
    const sourcePath = path.join(repoRoot, '.github', 'copilot-instructions.md');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, '# Copilot Agents Registry — Project Guidelines\n', 'utf-8');

    syncCursorRules(repoRoot);

    const rulesDir = path.join(repoRoot, '.cursor', 'rules');
    const staleGeneratedPath = path.join(rulesDir, 'old-generated.mdc');
    fs.writeFileSync(
      staleGeneratedPath,
      '<!-- Generated from .github/copilot-instructions.md — do not edit; run npm run sync:cursor-rules -->\nstale\n',
      'utf-8',
    );
    const customRulePath = path.join(rulesDir, 'custom-rule.mdc');
    fs.writeFileSync(customRulePath, '---\nalwaysApply: false\n---\n', 'utf-8');

    syncCursorRules(repoRoot);

    expect(fs.existsSync(staleGeneratedPath)).toBe(false);
    expect(fs.existsSync(customRulePath)).toBe(true);
  });

  it('treats CRLF mirror content as in sync when logically identical', (): void => {
    const repoRoot = makeRepoRoot();
    const sourcePath = path.join(repoRoot, '.github', 'copilot-instructions.md');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, '# Copilot Agents Registry — Project Guidelines\n', 'utf-8');

    syncCursorRules(repoRoot);

    const mirrorPath = path.join(repoRoot, '.cursor', 'rules', 'agents-registry.mdc');
    const content = fs.readFileSync(mirrorPath, 'utf-8');
    fs.writeFileSync(mirrorPath, content.replace(/\n/g, '\r\n'), 'utf-8');

    expect(checkIdeTargets(repoRoot, undefined, 'cursor-rules')).toEqual([]);
  });
});

describe('checkIdeTargets', (): void => {
  it('reports no drift after a successful sync', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'check-sync', {
      agents: [{ id: 'check-agent', name: 'check-agent', description: 'Agent for drift check tests.' }],
      flows: [],
    });

    const sourcePath = path.join(repoRoot, '.github', 'copilot-instructions.md');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, '# Copilot Agents Registry — Project Guidelines\n', 'utf-8');

    const pkg = new Package('agents-repo/check-sync', path.join(repoRoot, 'packages'));
    syncIdeTargets(repoRoot, pkg, 'all');

    expect(checkIdeTargets(repoRoot, pkg, 'all')).toEqual([]);
  });

  it('reports modified and stale mirror drift', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'check-drift', {
      agents: [{ id: 'fresh-agent', name: 'fresh-agent', description: 'Agent for drift detection tests.' }],
      flows: [],
    });

    const sourcePath = path.join(repoRoot, '.github', 'copilot-instructions.md');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, '# Copilot Agents Registry — Project Guidelines\n', 'utf-8');

    const pkg = new Package('agents-repo/check-drift', path.join(repoRoot, 'packages'));
    syncIdeTargets(repoRoot, pkg, 'all');

    const agentMirror = path.join(repoRoot, '.github', 'agents', 'fresh-agent.agent.md');
    fs.writeFileSync(agentMirror, 'stale agent mirror', 'utf-8');

    const staleSkillDir = path.join(repoRoot, '.cursor', 'skills', 'old-skill');
    fs.mkdirSync(staleSkillDir, { recursive: true });
    fs.writeFileSync(path.join(staleSkillDir, 'SKILL.md'), 'stale', 'utf-8');

    const issues = checkIdeTargets(repoRoot, pkg, 'all');
    expect(issues).toEqual(
      expect.arrayContaining([
        { kind: 'modified', path: path.join('.github', 'agents', 'fresh-agent.agent.md') },
        { kind: 'stale', path: path.join('.cursor', 'skills', 'old-skill') },
      ]),
    );
  });

  it('reports stale Claude and Codex mirror drift', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'check-drift-claude-codex', {
      agents: [{ id: 'fresh-agent', name: 'fresh-agent', description: 'Agent for drift detection tests.' }],
      flows: [],
    });

    const pkg = new Package('agents-repo/check-drift-claude-codex', path.join(repoRoot, 'packages'));
    syncClaudeCodeAgents(repoRoot, pkg);
    syncOpenaiCodexSkills(repoRoot, pkg);

    const staleClaudePath = path.join(repoRoot, '.claude', 'agents', 'old-claude-agent.md');
    fs.mkdirSync(path.dirname(staleClaudePath), { recursive: true });
    fs.writeFileSync(staleClaudePath, 'stale', 'utf-8');

    const staleCodexDir = path.join(repoRoot, '.agents', 'skills', 'old-codex-skill');
    fs.mkdirSync(staleCodexDir, { recursive: true });
    fs.writeFileSync(path.join(staleCodexDir, 'SKILL.md'), 'stale', 'utf-8');

    const claudeIssues = checkIdeTargets(repoRoot, pkg, 'claude-code');
    const codexIssues = checkIdeTargets(repoRoot, pkg, 'openai-codex');

    expect(claudeIssues).toEqual(
      expect.arrayContaining([{ kind: 'stale', path: path.join('.claude', 'agents', 'old-claude-agent.md') }]),
    );
    expect(codexIssues).toEqual(
      expect.arrayContaining([{ kind: 'stale', path: path.join('.agents', 'skills', 'old-codex-skill') }]),
    );
  });

  it('ignores hand-authored cursor rules when checking cursor-rules drift', (): void => {
    const repoRoot = makeRepoRoot();
    const sourcePath = path.join(repoRoot, '.github', 'copilot-instructions.md');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, '# Copilot Agents Registry — Project Guidelines\n', 'utf-8');

    syncCursorRules(repoRoot);

    const customRulePath = path.join(repoRoot, '.cursor', 'rules', 'custom-rule.mdc');
    fs.mkdirSync(path.dirname(customRulePath), { recursive: true });
    fs.writeFileSync(customRulePath, '---\nalwaysApply: false\n---\n', 'utf-8');

    expect(checkIdeTargets(repoRoot, undefined, 'cursor-rules')).toEqual([]);
  });

  it('reports stale generated cursor rules when checking cursor-rules drift', (): void => {
    const repoRoot = makeRepoRoot();
    const sourcePath = path.join(repoRoot, '.github', 'copilot-instructions.md');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, '# Copilot Agents Registry — Project Guidelines\n', 'utf-8');

    syncCursorRules(repoRoot);

    const staleGeneratedPath = path.join(repoRoot, '.cursor', 'rules', 'old-generated.mdc');
    fs.writeFileSync(
      staleGeneratedPath,
      '<!-- Generated from .github/copilot-instructions.md — do not edit; run npm run sync:cursor-rules -->\nstale\n',
      'utf-8',
    );

    expect(checkIdeTargets(repoRoot, undefined, 'cursor-rules')).toEqual([
      { kind: 'stale', path: path.join('.cursor', 'rules', 'old-generated.mdc') },
    ]);
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
    expect(written.some((entry) => entry.endsWith('.claude/agents/all-agent.md'))).toBe(true);
    expect(written.some((entry) => entry.endsWith('.agents/skills/all-agent/SKILL.md'))).toBe(true);
    expect(written.some((entry) => entry.endsWith('.cursor/rules/agents-registry.mdc'))).toBe(true);
  });

  it('runs only scoped package targets when target is all for a partially dogfooded package', (): void => {
    const repoRoot = makeRepoRoot();
    createDummyPackage(repoRoot, 'pr-comment-triage', {
      namespace: 'maiconfz',
      agents: [{ id: 'triage-agent', name: 'triage-agent', description: 'Agent for scoped all-target sync.' }],
      flows: [],
    });

    const sourcePath = path.join(repoRoot, '.github', 'copilot-instructions.md');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, '# Copilot Agents Registry — Project Guidelines\n', 'utf-8');

    const pkg = new Package('maiconfz/pr-comment-triage', path.join(repoRoot, 'packages'));
    const written = syncIdeTargets(repoRoot, pkg, 'all');

    expect(written.some((entry) => entry.endsWith('.github/agents/triage-agent.agent.md'))).toBe(true);
    expect(written.some((entry) => entry.endsWith('.cursor/skills/triage-agent/SKILL.md'))).toBe(true);
    expect(written.some((entry) => entry.includes('.claude/agents'))).toBe(false);
    expect(written.some((entry) => entry.includes('.agents/skills'))).toBe(false);
    expect(written.some((entry) => entry.endsWith('.cursor/rules/agents-registry.mdc'))).toBe(true);
    expect(checkIdeTargets(repoRoot, pkg, 'all')).toEqual([]);
  });

  it('runs only declared install targets when target is all for a non-dogfooded package', (): void => {
    const repoRoot = makeRepoRoot();
    const packageDir = createDummyPackage(repoRoot, 'cursor-only-sync', {
      agents: [{ id: 'cursor-only-agent', name: 'cursor-only-agent', description: 'Cursor-only all-target sync.' }],
      flows: [],
    });

    const metadataPath = path.join(packageDir, 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as Record<string, unknown>;
    metadata.compatibility = {
      canonicalFormat: 'agents-repo.agent-instruction@1.0.0',
      targets: [{ id: 'cursor', status: 'supported' }],
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    const sourcePath = path.join(repoRoot, '.github', 'copilot-instructions.md');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, '# Copilot Agents Registry — Project Guidelines\n', 'utf-8');

    const pkg = new Package('agents-repo/cursor-only-sync', path.join(repoRoot, 'packages'));
    const written = syncIdeTargets(repoRoot, pkg, 'all');

    expect(written.some((entry) => entry.endsWith('.cursor/skills/cursor-only-agent/SKILL.md'))).toBe(true);
    expect(written.some((entry) => entry.includes('.github/agents'))).toBe(false);
    expect(written.some((entry) => entry.includes('.claude/agents'))).toBe(false);
    expect(written.some((entry) => entry.includes('.agents/skills'))).toBe(false);
    expect(written.some((entry) => entry.endsWith('.cursor/rules/agents-registry.mdc'))).toBe(true);
    expect(checkIdeTargets(repoRoot, pkg, 'all')).toEqual([]);
  });
});
