#!/usr/bin/env node
/* eslint-disable security/detect-non-literal-fs-filename -- paths from REPO_ROOT, CONFIG constants, and vetted filenames from readdirSync */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CONFIG = {
  CURSOR_SOURCE: '.cursor/rules/agents-registry.mdc',
  COPILOT_TARGET: '.github/copilot-instructions.md',
  CLAUDE_TARGET: 'CLAUDE.md',
  CODEX_TARGET: 'AGENTS.md',
  INSTRUCTIONS_DIR: '.github/instructions',
  DESCRIPTION: 'Agents Registry project guidelines',
  TITLE_TRANSFORMS: [
    ['# Copilot Agents Registry — Project Guidelines', '# Agents Registry — Project Guidelines'],
    ['## Copilot Runtime Environment', '## Runtime Environment'],
    ['Copilot tasks in this repository', 'Agent tasks in this repository'],
  ],
  LEGACY_MIRROR_COMMENTS: [
    '<!-- Generated: .github/copilot-instructions.md. Run npm run sync:ide-instructions -->',
    '<!-- Generated from .github/copilot-instructions.md — do not edit; run npm run sync:cursor-rules -->',
  ],
};

const SOURCE_DIR = path.posix.dirname(CONFIG.CURSOR_SOURCE);

function generatedComment(sourceRelativePath) {
  return `<!-- Generated: ${sourceRelativePath}. Run npm run sync:ide-instructions -->`;
}

const REPO_WIDE_TARGETS = [
  {
    id: 'github-copilot',
    relativePath: () => CONFIG.COPILOT_TARGET,
    transform: transformCopilotMirror,
  },
  {
    id: 'claude-code',
    relativePath: () => CONFIG.CLAUDE_TARGET,
    transform: transformPlainMirror,
  },
  {
    id: 'openai-codex',
    relativePath: () => CONFIG.CODEX_TARGET,
    transform: transformPlainMirror,
  },
];

function printHelp() {
  console.log(`Usage:
  npm run sync:ide-instructions
  npm run sync:ide-instructions -- --check
  npm run sync:ide-instructions -- --help

Canonical: ${CONFIG.CURSOR_SOURCE}
Generates: ${CONFIG.COPILOT_TARGET}, ${CONFIG.CLAUDE_TARGET}, ${CONFIG.CODEX_TARGET}, and path-scoped ${CONFIG.INSTRUCTIONS_DIR}/*.instructions.md
`);
}

function normalizeEol(text) {
  return text.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

function parseSimpleYaml(block) {
  const result = {};
  for (const line of block.split('\n')) {
    // eslint-disable-next-line sonarjs/super-linear-regex -- simple YAML key lines only
    const match = /^(\w+):\s*(.*)$/.exec(line);
    if (!match) {
      continue;
    }
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

function parseMdc(content) {
  const normalized = normalizeEol(content);
  if (!normalized.startsWith('---\n')) {
    return { frontmatter: {}, body: normalized };
  }
  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) {
    return { frontmatter: {}, body: normalized };
  }
  const yamlBlock = normalized.slice(4, end);
  const body = normalized.slice(end + 5);
  return { frontmatter: parseSimpleYaml(yamlBlock), body };
}

function stripGeneratedComments(body) {
  const lines = normalizeEol(body).split('\n');
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (CONFIG.LEGACY_MIRROR_COMMENTS.includes(trimmed)) {
      return false;
    }
    if (trimmed.startsWith('<!-- Generated:') && trimmed.includes('sync:ide-instructions')) {
      return false;
    }
    return true;
  });
  return kept.join('\n').trim();
}

function readCanonicalSource() {
  const sourcePath = path.join(REPO_ROOT, CONFIG.CURSOR_SOURCE);
  if (!fs.existsSync(sourcePath)) {
    console.error(`Error: missing canonical source: ${CONFIG.CURSOR_SOURCE}`);
    process.exit(1);
  }
  const raw = normalizeEol(fs.readFileSync(sourcePath, 'utf-8'));
  const { body } = parseMdc(raw);
  return stripGeneratedComments(body);
}

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

const MARKDOWN_LINK_LEADING_PATH = /^(\S+)/;

function leadingMarkdownPath(value) {
  return MARKDOWN_LINK_LEADING_PATH.exec(value)?.[1] ?? value;
}

function scanInlineMarkdownLink(body, openBracket) {
  const closeBracket = body.indexOf(']', openBracket + 1);
  if (closeBracket === -1) {
    return { kind: 'end', tailStart: openBracket };
  }
  if (body.charAt(closeBracket + 1) !== '(') {
    return {
      kind: 'skip',
      append: body.charAt(openBracket),
      nextIndex: openBracket + 1,
    };
  }
  const closeParen = body.indexOf(')', closeBracket + 2);
  if (closeParen === -1) {
    return { kind: 'end', tailStart: openBracket };
  }
  return {
    kind: 'link',
    text: body.slice(openBracket + 1, closeBracket),
    url: body.slice(closeBracket + 2, closeParen),
    match: body.slice(openBracket, closeParen + 1),
    nextIndex: closeParen + 1,
  };
}

function formatRewrittenMarkdownLink(text, url, match, rewrittenUrl) {
  if (rewrittenUrl === url) {
    return match;
  }
  const pathPart = leadingMarkdownPath(url);
  const rewrittenPath = leadingMarkdownPath(rewrittenUrl);
  const rewrittenText = text === url || text === pathPart ? rewrittenPath : text;
  return `[${rewrittenText}](${rewrittenUrl})`;
}

function rewriteRelativeLinks(body, targetDir) {
  let result = '';
  let index = 0;
  while (index < body.length) {
    const openBracket = body.indexOf('[', index);
    if (openBracket === -1) {
      result += body.slice(index);
      break;
    }
    result += body.slice(index, openBracket);
    const scanned = scanInlineMarkdownLink(body, openBracket);
    if (scanned.kind === 'end') {
      result += body.slice(scanned.tailStart);
      break;
    }
    if (scanned.kind === 'skip') {
      result += scanned.append;
      index = scanned.nextIndex;
      continue;
    }
    if (scanned.url.length === 0) {
      result += scanned.match;
      index = scanned.nextIndex;
      continue;
    }
    const rewrittenUrl = rewriteMarkdownTarget(scanned.url, targetDir);
    result += formatRewrittenMarkdownLink(
      scanned.text,
      scanned.url,
      scanned.match,
      rewrittenUrl,
    );
    index = scanned.nextIndex;
  }
  return result;
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
  const comment = generatedComment(CONFIG.CURSOR_SOURCE);

  return [comment, '', body.trimEnd(), ''].join('\n');
}

function transformCopilotMirror(source) {
  const targetDir = path.posix.dirname(CONFIG.COPILOT_TARGET) || '.';
  const body = rewriteRelativeLinks(applyTitleTransforms(source), targetDir);
  const comment = generatedComment(CONFIG.CURSOR_SOURCE);

  return [comment, '', body.trimEnd(), ''].join('\n');
}

function validateInstructionsBasename(basename) {
  if (!basename || basename.includes('/') || basename.includes('..')) {
    throw new Error(`Invalid copilotInstructionsFile: ${basename}`);
  }
  if (!basename.endsWith('.instructions.md')) {
    throw new Error(`copilotInstructionsFile must end with .instructions.md: ${basename}`);
  }
}

function quoteApplyTo(glob) {
  if (!glob) {
    throw new Error('Path rule requires globs or copilotApplyTo');
  }
  if (glob.startsWith('"') || glob.startsWith("'")) {
    return glob;
  }
  return `"${glob}"`;
}

function loadPathRules() {
  const rulesDir = path.join(REPO_ROOT, path.posix.dirname(CONFIG.CURSOR_SOURCE));
  const canonicalName = path.basename(CONFIG.CURSOR_SOURCE);
  if (!fs.existsSync(rulesDir)) {
    return [];
  }

  const rules = [];
  for (const entry of fs.readdirSync(rulesDir)) {
    if (!entry.endsWith('.mdc') || entry === canonicalName) {
      continue;
    }
    const relativeMdc = path.posix.join(path.posix.dirname(CONFIG.CURSOR_SOURCE), entry);
    const absolutePath = path.join(REPO_ROOT, relativeMdc);
    const { frontmatter, body } = parseMdc(normalizeEol(fs.readFileSync(absolutePath, 'utf-8')));
    if (!frontmatter.copilotInstructionsFile) {
      continue;
    }
    validateInstructionsBasename(frontmatter.copilotInstructionsFile);
    const applyTo =
      frontmatter.copilotApplyTo ?? quoteApplyTo(frontmatter.globs);
    const description = frontmatter.description ?? '';
    rules.push({
      mdcRelativePath: relativeMdc,
      instructionsBasename: frontmatter.copilotInstructionsFile,
      applyTo,
      description,
      body: stripGeneratedComments(body),
    });
  }
  return rules;
}

function transformPathInstruction(rule) {
  const targetRelative = path.posix.join(CONFIG.INSTRUCTIONS_DIR, rule.instructionsBasename);
  const targetDir = path.posix.dirname(targetRelative);
  const body = rewriteRelativeLinks(applyTitleTransforms(rule.body), targetDir);
  const comment = generatedComment(rule.mdcRelativePath);

  return [
    '---',
    `applyTo: ${rule.applyTo}`,
    `description: "${rule.description.replaceAll('"', '\\"')}"`,
    '---',
    '',
    comment,
    '',
    body.trimEnd(),
    '',
  ].join('\n');
}

function isGeneratedOutputFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (CONFIG.LEGACY_MIRROR_COMMENTS.some((marker) => content.includes(marker))) {
      return true;
    }
    return content.includes('sync:ide-instructions') && content.includes('<!-- Generated:');
  } catch {
    return false;
  }
}

function listStaleInstructionFiles(instructionsDir, keepBasenames) {
  if (!fs.existsSync(instructionsDir)) {
    return [];
  }
  const stale = [];
  for (const entry of fs.readdirSync(instructionsDir)) {
    if (!entry.endsWith('.instructions.md') || keepBasenames.has(entry)) {
      continue;
    }
    const filePath = path.join(instructionsDir, entry);
    if (!isGeneratedOutputFile(filePath)) {
      continue;
    }
    stale.push(filePath);
  }
  return stale;
}

function collectIssues(source, pathRules) {
  const issues = [];

  for (const target of REPO_WIDE_TARGETS) {
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
  }

  const keepBasenames = new Set();
  for (const rule of pathRules) {
    keepBasenames.add(rule.instructionsBasename);
    const relativePath = path.posix.join(CONFIG.INSTRUCTIONS_DIR, rule.instructionsBasename);
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const expected = normalizeEol(transformPathInstruction(rule));

    if (!fs.existsSync(absolutePath)) {
      issues.push({ kind: 'missing', path: relativePath });
      continue;
    }

    const actual = normalizeEol(fs.readFileSync(absolutePath, 'utf-8'));
    if (actual !== expected) {
      issues.push({ kind: 'modified', path: relativePath });
    }
  }

  const instructionsDir = path.join(REPO_ROOT, CONFIG.INSTRUCTIONS_DIR);
  for (const stalePath of listStaleInstructionFiles(instructionsDir, keepBasenames)) {
    issues.push({ kind: 'stale', path: path.relative(REPO_ROOT, stalePath) });
  }

  return issues;
}

function checkMirrors() {
  const source = readCanonicalSource();
  let pathRules = [];
  try {
    pathRules = loadPathRules();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const issues = collectIssues(source, pathRules);

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
  const source = readCanonicalSource();
  const pathRules = loadPathRules();

  for (const target of REPO_WIDE_TARGETS) {
    const relativePath = target.relativePath();
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const content = target.transform(source, relativePath);

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, 'utf-8');
    console.log(`Synced ${relativePath}`);
  }

  const keepBasenames = new Set();
  for (const rule of pathRules) {
    keepBasenames.add(rule.instructionsBasename);
    const relativePath = path.posix.join(CONFIG.INSTRUCTIONS_DIR, rule.instructionsBasename);
    const absolutePath = path.join(REPO_ROOT, relativePath);
    const content = transformPathInstruction(rule);

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, 'utf-8');
    console.log(`Synced ${relativePath}`);
  }

  const instructionsDir = path.join(REPO_ROOT, CONFIG.INSTRUCTIONS_DIR);
  for (const stalePath of listStaleInstructionFiles(instructionsDir, keepBasenames)) {
    fs.rmSync(stalePath, { force: true });
    console.log(`  removed stale ${path.relative(REPO_ROOT, stalePath)}`);
  }
}

const argv = new Set(process.argv.slice(2));
if (argv.has('--help') || argv.has('-h')) {
  printHelp();
} else if (argv.has('--check')) {
  checkMirrors();
} else {
  writeMirrors();
}
