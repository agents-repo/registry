import fs from 'node:fs';
import path from 'node:path';
import { listDeploymentAgentFiles } from '../deployment-agents';
import { agentMdToSkillMd } from '../emitters/agent-instruction';
import { resolveDeclaredInstallTargets } from '../compatibility';
import { ErrorCode, PackageError } from '../errors';
import { Package } from '../package';
import type { InstallTargetId, PackageMetadata } from '../types';

export const IDE_SYNC_TARGETS = ['github-copilot', 'cursor', 'cursor-rules', 'all'] as const;
export type IdeSyncTarget = (typeof IDE_SYNC_TARGETS)[number];

const PACKAGE_IDE_SYNC_TARGETS = ['github-copilot', 'cursor'] as const;

/** Packages whose IDE mirrors are committed in this repository. */
export const DOGFOODED_PACKAGE_IDS = [
  'agents-repo/agents-repo-package-creation',
  'maiconfz/pr-comment-triage',
] as const;

const COPILOT_INSTRUCTIONS_REL = path.join('.github', 'copilot-instructions.md');
const CURSOR_RULES_REL = path.join('.cursor', 'rules', 'agents-registry.mdc');
const GITHUB_AGENTS_REL = path.join('.github', 'agents');
const CURSOR_SKILLS_REL = path.join('.cursor', 'skills');

const CURSOR_RULES_GENERATED_COMMENT =
  '<!-- Generated from .github/copilot-instructions.md — do not edit; run npm run sync:cursor-rules -->';

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

function listDogfoodedAgentFileNames(pkg: Package): Set<string> {
  const names = new Set<string>();
  for (const qualifiedId of DOGFOODED_PACKAGE_IDS) {
    const dogfoodPkg = new Package(qualifiedId, pkg.packagesDir);
    if (!fs.existsSync(dogfoodPkg.packageDir)) {
      continue;
    }

    for (const file of listDeploymentAgentFiles(dogfoodPkg.packageDir)) {
      names.add(`${file.id}.agent.md`);
    }
  }

  for (const file of listDeploymentAgentFiles(pkg.packageDir)) {
    names.add(`${file.id}.agent.md`);
  }

  return names;
}

function listDogfoodedSkillIds(pkg: Package): Set<string> {
  const ids = new Set<string>();
  for (const qualifiedId of DOGFOODED_PACKAGE_IDS) {
    const dogfoodPkg = new Package(qualifiedId, pkg.packagesDir);
    if (!fs.existsSync(dogfoodPkg.packageDir)) {
      continue;
    }

    for (const file of listDeploymentAgentFiles(dogfoodPkg.packageDir)) {
      ids.add(file.id);
    }
  }

  for (const file of listDeploymentAgentFiles(pkg.packageDir)) {
    ids.add(file.id);
  }

  return ids;
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

const CURSOR_RULES_SOURCE_DIR = '.github';
const CURSOR_RULES_TARGET_DIR = '.cursor/rules';

function isGeneratedCursorRuleFile(filePath: string): boolean {
  try {
    return fs.readFileSync(filePath, 'utf-8').includes(CURSOR_RULES_GENERATED_COMMENT);
  } catch {
    return false;
  }
}

function normalizeEol(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function rewriteMarkdownTarget(url: string, sourceDir: string, targetDir: string): string {
  const titlePattern = /^(\S+)(\s+"(?:[^"\\]|\\.)*")$/;
  const titleMatch = titlePattern.exec(url);
  const pathPart = titleMatch ? titleMatch[1] : url.trim();
  const titleSuffix = titleMatch ? titleMatch[2] : '';

  if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(pathPart)) {
    return url;
  }

  const resolvedFromRoot = path.posix.normalize(path.posix.join(sourceDir, pathPart));
  const rewritten = path.posix.relative(targetDir, resolvedFromRoot);
  return `${rewritten}${titleSuffix}`;
}

function rewriteRelativeLinks(body: string): string {
  // Copilot instructions use simple inline markdown links only.
  // eslint-disable-next-line sonarjs/slow-regex -- bounded repo-owned input
  return body.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, text: string, url: string) => {
    const rewrittenUrl = rewriteMarkdownTarget(url, CURSOR_RULES_SOURCE_DIR, CURSOR_RULES_TARGET_DIR);
    if (rewrittenUrl === url) {
      return match;
    }

    const pathPattern = /^(\S+)/;
    const pathPart = pathPattern.exec(url)?.[1] ?? url;
    const rewrittenPath = pathPattern.exec(rewrittenUrl)?.[1] ?? rewrittenUrl;
    const rewrittenText = text === url || text === pathPart ? rewrittenPath : text;
    return `[${rewrittenText}](${rewrittenUrl})`;
  });
}

function removeStaleGeneratedCursorRuleFiles(rulesDir: string, keepFileNames: Set<string>): void {
  if (!fs.existsSync(rulesDir)) {
    return;
  }

  for (const entry of fs.readdirSync(rulesDir)) {
    if (!entry.endsWith('.mdc') || keepFileNames.has(entry)) {
      continue;
    }

    const filePath = path.join(rulesDir, entry);
    if (!isGeneratedCursorRuleFile(filePath)) {
      continue;
    }

    fs.rmSync(filePath, { force: true });
  }
}

export type IdeSyncDriftKind = 'missing' | 'modified' | 'stale';

export interface IdeSyncDriftIssue {
  kind: IdeSyncDriftKind;
  path: string;
}

function readPackageVersion(metadata: PackageMetadata): string {
  const version = metadata.version;
  if (typeof version !== 'string' || version.trim().length === 0) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      'metadata.json version is required for cursor skill sync',
    );
  }

  return version;
}

function expectedGithubCopilotAgents(pkg: Package): Map<string, string> {
  const metadata = pkg.loadMetadata();
  assertInstallTargetDeclared(metadata, 'github-copilot');

  const expected = new Map<string, string>();
  for (const file of listDeploymentAgentFiles(pkg.packageDir)) {
    expected.set(path.join(GITHUB_AGENTS_REL, `${file.id}.agent.md`), file.content);
  }

  return expected;
}

function expectedCursorSkills(pkg: Package): Map<string, string> {
  const metadata = pkg.loadMetadata();
  assertInstallTargetDeclared(metadata, 'cursor');
  const version = readPackageVersion(metadata);

  const expected = new Map<string, string>();
  for (const file of listDeploymentAgentFiles(pkg.packageDir)) {
    expected.set(
      path.join(CURSOR_SKILLS_REL, file.id, 'SKILL.md'),
      agentMdToSkillMd(file.content, version),
    );
  }

  return expected;
}

function expectedCursorRules(repoRoot: string): Map<string, string> {
  const sourcePath = path.join(repoRoot, COPILOT_INSTRUCTIONS_REL);
  if (!fs.existsSync(sourcePath)) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `Missing source file for cursor-rules sync: ${COPILOT_INSTRUCTIONS_REL}`,
    );
  }

  const source = normalizeEol(fs.readFileSync(sourcePath, 'utf-8'));
  return new Map([[CURSOR_RULES_REL, transformCopilotInstructionsToCursorRules(source)]]);
}

function compareExpectedFiles(repoRoot: string, expected: Map<string, string>): IdeSyncDriftIssue[] {
  const issues: IdeSyncDriftIssue[] = [];

  for (const [relativePath, expectedContent] of expected) {
    const fullPath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(fullPath)) {
      issues.push({ kind: 'missing', path: relativePath });
      continue;
    }

    const actualContent = normalizeEol(fs.readFileSync(fullPath, 'utf-8'));
    if (actualContent !== normalizeEol(expectedContent)) {
      issues.push({ kind: 'modified', path: relativePath });
    }
  }

  return issues;
}

function findStaleGithubAgentFiles(repoRoot: string, keepFileNames: Set<string>): string[] {
  const agentsDir = path.join(repoRoot, GITHUB_AGENTS_REL);
  if (!fs.existsSync(agentsDir)) {
    return [];
  }

  const stalePaths: string[] = [];
  for (const entry of fs.readdirSync(agentsDir)) {
    if (!entry.endsWith('.agent.md') || keepFileNames.has(entry)) {
      continue;
    }

    stalePaths.push(path.join(GITHUB_AGENTS_REL, entry));
  }

  return stalePaths;
}

function findStaleCursorRuleFiles(repoRoot: string, keepFileNames: Set<string>): string[] {
  const rulesDir = path.join(repoRoot, path.dirname(CURSOR_RULES_REL));
  if (!fs.existsSync(rulesDir)) {
    return [];
  }

  const stalePaths: string[] = [];
  for (const entry of fs.readdirSync(rulesDir)) {
    if (!entry.endsWith('.mdc') || keepFileNames.has(entry)) {
      continue;
    }

    const filePath = path.join(rulesDir, entry);
    if (!isGeneratedCursorRuleFile(filePath)) {
      continue;
    }

    stalePaths.push(path.join(path.dirname(CURSOR_RULES_REL), entry));
  }

  return stalePaths;
}

function findStaleSkillDirs(repoRoot: string, keepIds: Set<string>): string[] {
  const skillsRoot = path.join(repoRoot, CURSOR_SKILLS_REL);
  if (!fs.existsSync(skillsRoot)) {
    return [];
  }

  const stalePaths: string[] = [];
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || keepIds.has(entry.name)) {
      continue;
    }

    stalePaths.push(path.join(CURSOR_SKILLS_REL, entry.name));
  }

  return stalePaths;
}

function checkGithubCopilotAgents(repoRoot: string, pkg: Package): IdeSyncDriftIssue[] {
  const expected = expectedGithubCopilotAgents(pkg);
  const issues = compareExpectedFiles(repoRoot, expected);
  const keepFileNames = listDogfoodedAgentFileNames(pkg);

  for (const stalePath of findStaleGithubAgentFiles(repoRoot, keepFileNames)) {
    issues.push({ kind: 'stale', path: stalePath });
  }

  return issues;
}

function checkCursorSkills(repoRoot: string, pkg: Package): IdeSyncDriftIssue[] {
  const expected = expectedCursorSkills(pkg);
  const issues = compareExpectedFiles(repoRoot, expected);
  const keepIds = listDogfoodedSkillIds(pkg);

  for (const stalePath of findStaleSkillDirs(repoRoot, keepIds)) {
    issues.push({ kind: 'stale', path: stalePath });
  }

  return issues;
}

function checkCursorRules(repoRoot: string): IdeSyncDriftIssue[] {
  const expected = expectedCursorRules(repoRoot);
  const issues = compareExpectedFiles(repoRoot, expected);
  const keepFileNames = new Set(
    [...expected.keys()].map((relativePath) => path.basename(relativePath)),
  );

  for (const stalePath of findStaleCursorRuleFiles(repoRoot, keepFileNames)) {
    issues.push({ kind: 'stale', path: stalePath });
  }

  return issues;
}

export function checkIdeTargets(
  repoRoot: string,
  pkg: Package | undefined,
  target: IdeSyncTarget,
): IdeSyncDriftIssue[] {
  const issues: IdeSyncDriftIssue[] = [];

  const runPackageCheck = (packageTarget: 'github-copilot' | 'cursor'): void => {
    if (!pkg) {
      throw new PackageError(
        ErrorCode.ERR_VALIDATION_FAILED,
        `--package is required for target "${packageTarget}"`,
      );
    }

    if (packageTarget === 'github-copilot') {
      issues.push(...checkGithubCopilotAgents(repoRoot, pkg));
      return;
    }

    issues.push(...checkCursorSkills(repoRoot, pkg));
  };

  if (target === 'all') {
    for (const packageTarget of PACKAGE_IDE_SYNC_TARGETS) {
      runPackageCheck(packageTarget);
    }
    issues.push(...checkCursorRules(repoRoot));
    return issues;
  }

  if (target === 'cursor-rules') {
    return checkCursorRules(repoRoot);
  }

  runPackageCheck(target);
  return issues;
}

export function transformCopilotInstructionsToCursorRules(source: string): string {
  let body = source;
  for (const [from, to] of CURSOR_RULES_TRANSFORMS) {
    body = body.replaceAll(from, to);
  }
  body = rewriteRelativeLinks(body);

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

  removeStaleFiles(agentsDir, listDogfoodedAgentFileNames(pkg), '.agent.md');
  return written;
}

export function syncCursorSkills(repoRoot: string, pkg: Package): string[] {
  const metadata = pkg.loadMetadata();
  assertInstallTargetDeclared(metadata, 'cursor');
  const version = readPackageVersion(metadata);

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

  removeStaleSkillDirs(skillsRoot, listDogfoodedSkillIds(pkg));
  return written;
}

export function syncCursorRules(repoRoot: string): string {
  const expected = expectedCursorRules(repoRoot);
  const [relativePath, content] = [...expected.entries()][0];
  const targetPath = path.join(repoRoot, relativePath);
  writeFileEnsuringDir(targetPath, content);
  removeStaleGeneratedCursorRuleFiles(
    path.dirname(targetPath),
    new Set([path.basename(relativePath)]),
  );
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
