import fs from 'node:fs';
import path from 'node:path';
import { listDeploymentAgentFiles } from '../deployment-agents';
import { agentMdToSkillMd } from '../emitters/agent-instruction';
import { resolveDeclaredInstallTargets } from '../compatibility';
import { ErrorCode, PackageError } from '../errors';
import type { InstallTargetId, PackageMetadata } from '../types';
import type { Package } from '../package';

export const IDE_SYNC_TARGETS = ['github-copilot', 'cursor', 'cursor-rules', 'all'] as const;
export type IdeSyncTarget = (typeof IDE_SYNC_TARGETS)[number];

const PACKAGE_IDE_SYNC_TARGETS = ['github-copilot', 'cursor'] as const;

const COPILOT_INSTRUCTIONS_REL = path.join('.github', 'copilot-instructions.md');
const CURSOR_RULES_REL = path.join('.cursor', 'rules', 'agents-registry.mdc');
const GITHUB_AGENTS_REL = path.join('.github', 'agents');
const CURSOR_SKILLS_REL = path.join('.cursor', 'skills');

const CURSOR_RULES_GENERATED_COMMENT =
  '<!-- Generated from .github/copilot-instructions.md — do not edit; run package:sync-ide-targets --target cursor-rules -->';

const CURSOR_RULES_TRANSFORMS: Array<[string, string]> = [
  ['# Copilot Agents Registry — Project Guidelines', '# Agents Registry — Project Guidelines'],
  ['## Copilot Runtime Environment', '## Runtime Environment'],
  ['Copilot tasks in this repository', 'Agent tasks in this repository'],
];

function assertInstallTargetDeclared(metadata: PackageMetadata, targetId: InstallTargetId): void {
  const declared = resolveDeclaredInstallTargets(metadata);
  const match = declared.find((entry) => entry.id === targetId);
  if (!match) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `Package does not declare install target "${targetId}" for sync`,
    );
  }

  if (match.status !== 'supported' && match.status !== 'experimental') {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `Install target "${targetId}" must be supported or experimental for sync, got: ${match.status}`,
    );
  }
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileEnsuringDir(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

function removeStaleFiles(dirPath: string, keepFileNames: Set<string>, extension: string): void {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  for (const entry of fs.readdirSync(dirPath)) {
    if (!entry.endsWith(extension)) {
      continue;
    }

    if (!keepFileNames.has(entry)) {
      fs.rmSync(path.join(dirPath, entry), { force: true });
    }
  }
}

function removeStaleSkillDirs(skillsRoot: string, keepIds: Set<string>): void {
  if (!fs.existsSync(skillsRoot)) {
    return;
  }

  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (!keepIds.has(entry.name)) {
      fs.rmSync(path.join(skillsRoot, entry.name), { recursive: true, force: true });
    }
  }
}

export function transformCopilotInstructionsToCursorRules(source: string): string {
  let body = source;
  for (const [from, to] of CURSOR_RULES_TRANSFORMS) {
    body = body.replaceAll(from, to);
  }

  return [
    '---',
    'description: Agents Registry project guidelines (mirrors copilot-instructions.md)',
    'alwaysApply: true',
    '---',
    '',
    CURSOR_RULES_GENERATED_COMMENT,
    '',
    body.trimEnd(),
    '',
  ].join('\n');
}

export function syncGithubCopilotAgents(repoRoot: string, pkg: Package): string[] {
  const metadata = pkg.loadMetadata();
  assertInstallTargetDeclared(metadata, 'github-copilot');

  const agentsDir = path.join(repoRoot, GITHUB_AGENTS_REL);
  const files = listDeploymentAgentFiles(pkg.packageDir);
  const written: string[] = [];

  ensureDir(agentsDir);
  for (const file of files) {
    const fileName = `${file.id}.agent.md`;
    const targetPath = path.join(agentsDir, fileName);
    writeFileEnsuringDir(targetPath, file.content);
    written.push(path.relative(repoRoot, targetPath));
  }

  removeStaleFiles(agentsDir, new Set(files.map((file) => `${file.id}.agent.md`)), '.agent.md');
  return written;
}

export function syncCursorSkills(repoRoot: string, pkg: Package): string[] {
  const metadata = pkg.loadMetadata();
  assertInstallTargetDeclared(metadata, 'cursor');

  const version = metadata.version;
  if (typeof version !== 'string' || version.trim().length === 0) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      'metadata.json version is required for cursor skill sync',
    );
  }

  const skillsRoot = path.join(repoRoot, CURSOR_SKILLS_REL);
  const files = listDeploymentAgentFiles(pkg.packageDir);
  const written: string[] = [];

  ensureDir(skillsRoot);
  for (const file of files) {
    const skillDir = path.join(skillsRoot, file.id);
    const targetPath = path.join(skillDir, 'SKILL.md');
    writeFileEnsuringDir(targetPath, agentMdToSkillMd(file.content, version));
    written.push(path.relative(repoRoot, targetPath));
  }

  removeStaleSkillDirs(skillsRoot, new Set(files.map((file) => file.id)));
  return written;
}

export function syncCursorRules(repoRoot: string): string {
  const sourcePath = path.join(repoRoot, COPILOT_INSTRUCTIONS_REL);
  if (!fs.existsSync(sourcePath)) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `Missing source file for cursor-rules sync: ${COPILOT_INSTRUCTIONS_REL}`,
    );
  }

  const source = fs.readFileSync(sourcePath, 'utf-8');
  const targetPath = path.join(repoRoot, CURSOR_RULES_REL);
  const content = transformCopilotInstructionsToCursorRules(source);
  writeFileEnsuringDir(targetPath, content);
  return path.relative(repoRoot, targetPath);
}

export function syncIdeTargets(
  repoRoot: string,
  pkg: Package | undefined,
  target: IdeSyncTarget,
): string[] {
  const written: string[] = [];

  const runPackageTarget = (packageTarget: 'github-copilot' | 'cursor'): void => {
    if (!pkg) {
      throw new PackageError(
        ErrorCode.ERR_VALIDATION_FAILED,
        `--package is required for target "${packageTarget}"`,
      );
    }

    if (packageTarget === 'github-copilot') {
      written.push(...syncGithubCopilotAgents(repoRoot, pkg));
      return;
    }
    written.push(...syncCursorSkills(repoRoot, pkg));
  };

  if (target === 'all') {
    for (const packageTarget of PACKAGE_IDE_SYNC_TARGETS) {
      runPackageTarget(packageTarget);
    }
    written.push(syncCursorRules(repoRoot));
    return written;
  }

  if (target === 'cursor-rules') {
    written.push(syncCursorRules(repoRoot));
    return written;
  }

  runPackageTarget(target);
  return written;
}
