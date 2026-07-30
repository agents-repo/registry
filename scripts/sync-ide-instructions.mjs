#!/usr/bin/env node
/* eslint-disable security/detect-non-literal-fs-filename -- paths from REPO_ROOT, CONFIG constants, and vetted filenames from readdirSync */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CONFIG = {
  SOURCE: '.github/copilot-instructions.md',
  CURSOR_TARGET: '.cursor/rules/agents-registry.mdc',
  CLAUDE_TARGET: 'CLAUDE.md',
  CODEX_TARGET: 'AGENTS.md',
  DESCRIPTION: 'Agents Registry project guidelines (mirrors copilot-instructions.md)',
  GENERATED_COMMENT:
    '<!-- Generated: .github/copilot-instructions.md. Run npm run sync:ide-instructions -->',
  LEGACY_GENERATED_COMMENT:
    '<!-- Generated from .github/copilot-instructions.md — do not edit; run npm run sync:cursor-rules -->',
  TITLE_TRANSFORMS: [
    ['# Copilot Agents Registry — Project Guidelines', '# Agents Registry — Project Guidelines'],
    ['## Copilot Runtime Environment', '## Runtime Environment'],
    ['Copilot tasks in this repository', 'Agent tasks in this repository'],
  ],
};

const MIRROR_TARGETS = [
  {
    id: 'cursor',
    relativePath: () => CONFIG.CURSOR_TARGET,
    transform: transformCursorMirror,
    staleCheck: listStaleMdcFiles,
  },
  {
    id: 'claude-code',
    relativePath: () => CONFIG.CLAUDE_TARGET,
    transform: transformPlainMirror,
    staleCheck: null,
  },
  {
    id: 'openai-codex',
    relativePath: () => CONFIG.CODEX_TARGET,
    transform: transformPlainMirror,
    staleCheck: null,
  },
];

function printHelp() {
  console.log(`Usage:
  npm run sync:ide-instructions
  npm run sync:ide-instructions -- --check
  npm run sync:ide-instructions -- --help

Sync ${CONFIG.SOURCE} -> ${CONFIG.CURSOR_TARGET}, ${CONFIG.CLAUDE_TARGET}, ${CONFIG.CODEX_TARGET}
`);
}

const SOURCE_DIR = path.posix.dirname(CONFIG.SOURCE);

function rewriteMarkdownTarget(url, targetDir) {
  const titlePattern = /^(\S+)(\s+"(?:[^"\\]|\\.)*")$/;
  const titleMatch = titlePattern.exec(url);
  const pathPart = titleMatch ? titleMatch[1] : url.trim();
  const titleSuffix = titleMatch ? titleMatch[2] : '';

  if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(pathPart)) {
    return url;
  }

  if (pathPart.startsWith('/')) {
    const resolvedFromRoot = path.posix.normalize(pathPart.slice(1));
    const rewritten = path.posix.relative(targetDir, resolvedFromRoot);
    return `${rewritten}${titleSuffix}`;
  }

  const resolvedFromRoot = path.posix.normalize(path.posix.join(SOURCE_DIR, pathPart));
  const rewritten = path.posix.relative(targetDir, resolvedFromRoot);
  return `${rewritten}${titleSuffix}`;
}

function rewriteRelativeLinks(body, targetDir) {
  // Copilot instructions use simple inline markdown links only.
  // eslint-disable-next-line sonarjs/super-linear-regex -- bounded repo-owned input
  return body.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, text, url) => {
    const rewrittenUrl = rewriteMarkdownTarget(url, targetDir);
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

function applyTitleTransforms(body) {
  let result = body;
  for (const [from, to] of CONFIG.TITLE_TRANSFORMS) {
    result = result.replaceAll(from, to);
  }
  return result;
}

function transformPlainMirror(source, targetRelativePath) {
  const targetDir = path.posix.dirname(targetRelativePath) || '.';
  const body = rewriteRelativeLinks(applyTitleTransforms(source), targetDir);

  return [CONFIG.GENERATED_COMMENT, '', body.trimEnd(), ''].join('\n');
}

function transformCursorMirror(source) {
  const targetDir = path.posix.dirname(CONFIG.CURSOR_TARGET);
  const body = rewriteRelativeLinks(applyTitleTransforms(source), targetDir);

  return [
    '---',
    `description: ${CONFIG.DESCRIPTION}`,
    'alwaysApply: true',
    '---',
    '',
    CONFIG.GENERATED_COMMENT,
    '',
    body.trimEnd(),
    '',
  ].join('\n');
}

function normalizeEol(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function isGeneratedMirrorFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return (
      content.includes(CONFIG.GENERATED_COMMENT) ||
      content.includes(CONFIG.LEGACY_GENERATED_COMMENT)
    );
  } catch {
    return false;
  }
}

function listStaleMdcFiles(rulesDir, keepFileName) {
  if (!fs.existsSync(rulesDir)) {
    return [];
  }

  const stale = [];
  for (const entry of fs.readdirSync(rulesDir)) {
    if (!entry.endsWith('.mdc') || entry === keepFileName) {
      continue;
    }

    const filePath = path.join(rulesDir, entry);
    if (!isGeneratedMirrorFile(filePath)) {
      continue;
    }

    stale.push(filePath);
  }
  return stale;
}

function collectIssues(source) {
  const issues = [];

  for (const target of MIRROR_TARGETS) {
    const relativePath = target.relativePath();
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const expected = normalizeEol(target.transform(source, relativePath));

    if (!fs.existsSync(absolutePath)) {
      issues.push({ kind: 'missing', path: relativePath });
      continue;
    }

    const actual = normalizeEol(fs.readFileSync(absolutePath, 'utf-8'));
    if (actual !== expected) {
      issues.push({ kind: 'modified', path: relativePath });
    }

    if (target.staleCheck) {
      const rulesDir = path.dirname(absolutePath);
      const keepFileName = path.basename(absolutePath);
      for (const stalePath of target.staleCheck(rulesDir, keepFileName)) {
        issues.push({ kind: 'stale', path: path.relative(REPO_ROOT, stalePath) });
      }
    }
  }

  return issues;
}

function checkMirrors() {
  const sourcePath = path.join(REPO_ROOT, CONFIG.SOURCE);
  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: missing source file: ${CONFIG.SOURCE}`);
    process.exit(1);
  }

  const source = normalizeEol(fs.readFileSync(sourcePath, 'utf-8'));
  const issues = collectIssues(source);

  if (issues.length > 0) {
    console.error('IDE instruction mirror drift detected');
    for (const issue of issues) {
      console.error(`  [${issue.kind}] ${issue.path}`);
    }
    process.exit(1);
  }

  console.log('IDE instruction mirrors are up to date');
}

function writeMirrors() {
  const sourcePath = path.join(REPO_ROOT, CONFIG.SOURCE);
  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: missing source file: ${CONFIG.SOURCE}`);
    process.exit(1);
  }

  const source = normalizeEol(fs.readFileSync(sourcePath, 'utf-8'));

  for (const target of MIRROR_TARGETS) {
    const relativePath = target.relativePath();
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const content = target.transform(source, relativePath);

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, 'utf-8');
    console.log(`Synced ${relativePath}`);

    if (target.staleCheck) {
      const rulesDir = path.dirname(absolutePath);
      const keepFileName = path.basename(absolutePath);
      for (const stalePath of target.staleCheck(rulesDir, keepFileName)) {
        fs.rmSync(stalePath, { force: true });
        console.log(`  removed stale ${path.relative(REPO_ROOT, stalePath)}`);
      }
    }
  }
}

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  printHelp();
} else if (argv.includes('--check')) {
  checkMirrors();
} else {
  writeMirrors();
}
