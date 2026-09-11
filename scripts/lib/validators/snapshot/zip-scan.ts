import AdmZip from 'adm-zip';
import { parseFrontmatter, parseFrontmatterData } from '../../frontmatter';
import type { InstallTargetId, ValidationIssue } from '../../types';
import { err } from '../common/issues';
import {
  AGENTS_DIR,
  AGENT_FILE_EXT,
  DEPLOYMENT_ZIP_ENTRY_PATTERN,
  FLOWS_DIR,
  ALLOWED_ZIP_EXTENSIONS,
  PATH_ENCODING_VERSION,
  ZIP_MAX_ENTRY_NAME_LENGTH,
  ZIP_SYMLINK_TYPE,
  ZIP_UNIX_MODE_MASK,
  ZIP_UNIX_TYPE_MASK,
  VERSIONS_DIR,
} from '../../constants';

const ALLOWED_ZIP_EXTENSION_SUFFIXES = Array.from(ALLOWED_ZIP_EXTENSIONS).sort(
  (left, right) => right.length - left.length,
);

export function hasAllowedZipExtension(name: string): boolean {
  return ALLOWED_ZIP_EXTENSION_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

function getConstrainedSourceRoot(name: string): string | undefined {
  const lowerName = name.toLowerCase();
  if (lowerName.startsWith(`${AGENTS_DIR}/`)) {
    return AGENTS_DIR;
  }

  if (lowerName.startsWith(`${FLOWS_DIR}/`)) {
    return FLOWS_DIR;
  }

  return undefined;
}

function hasTraversalPattern(name: string): boolean {
  if (
    name.includes('\0') ||
    name.startsWith('/') ||
    name.includes('\\') ||
    /^[A-Za-z]:/.test(name)
  ) {
    return true;
  }

  return name.split('/').includes('..');
}

function validateEntryPath(name: string, issues: ValidationIssue[]): boolean {
  if (name.length === 0 || name.length > ZIP_MAX_ENTRY_NAME_LENGTH) {
    issues.push(err('ERR_ZIP_MALFORMED_ENTRY', `Malformed ZIP entry name length: "${name}"`));
    return false;
  }

  if (hasTraversalPattern(name)) {
    issues.push(err('ERR_ZIP_TRAVERSAL', `Path traversal detected in ZIP entry: "${name}"`));
    return false;
  }

  return true;
}

function validateNotSymlink(entry: AdmZip.IZipEntry, name: string, issues: ValidationIssue[]): boolean {
  const unixMode = (entry.attr >>> 16) & ZIP_UNIX_MODE_MASK;
  if (unixMode !== 0 && (unixMode & ZIP_UNIX_TYPE_MASK) === ZIP_SYMLINK_TYPE) {
    issues.push(err('ERR_ZIP_SYMLINK', `Symlink entry detected in ZIP: "${name}"`));
    return false;
  }

  return true;
}

function trackEntryCollisions(
  name: string,
  issues: ValidationIssue[],
  seenExact: Set<string>,
  seenLower: Map<string, string>,
): void {
  if (seenExact.has(name)) {
    issues.push(err('ERR_ZIP_COLLISION', `Duplicate ZIP entry: "${name}"`));
  } else {
    seenExact.add(name);
  }

  const lower = name.toLowerCase();
  const firstSeen = seenLower.get(lower);
  if (firstSeen !== undefined && firstSeen !== name) {
    issues.push(
      err(
        'ERR_ZIP_COLLISION',
        `Case-collision ZIP entry: "${name}" collides with "${firstSeen}"`,
      ),
    );
    return;
  }

  if (firstSeen === undefined) {
    seenLower.set(lower, name);
  }
}

function validateFrontmatterVersion(
  entry: AdmZip.IZipEntry,
  name: string,
  expectedVersion: string,
  issues: ValidationIssue[],
  scope: 'deployment' | 'source',
): void {
  try {
    const content = entry.getData().toString('utf-8');
    const frontmatter = parseFrontmatter(content);
    if (frontmatter['version'] === expectedVersion) {
      return;
    }

    const frontmatterVersion = Object.hasOwn(frontmatter, 'version')
      ? frontmatter['version']
      : undefined;
    const frontmatterVersionDisplay =
      frontmatterVersion === undefined
        ? '(missing)'
        : (JSON.stringify(frontmatterVersion) ?? String(frontmatterVersion));

    const prefix = scope === 'deployment' ? 'Deployment' : 'Source';
    issues.push(
      err(
        'ERR_FRONTMATTER_VERSION_MISMATCH',
        `${prefix} ZIP entry "${name}": frontmatter version ${frontmatterVersionDisplay} must be "${expectedVersion}"`,
      ),
    );
  } catch {
    const prefix = scope === 'deployment' ? 'deployment' : 'source';
    issues.push(err('ERR_ZIP_MALFORMED_ENTRY', `Cannot read content of ${prefix} ZIP entry: "${name}"`));
  }
}

function validatePatternedFrontmatterEntry(
  entry: AdmZip.IZipEntry,
  name: string,
  expectedVersion: string,
  issues: ValidationIssue[],
  pattern: RegExp,
  unexpectedMessage: string,
): void {
  if (!pattern.test(name)) {
    issues.push(err('ERR_ZIP_UNEXPECTED_ENTRY', unexpectedMessage));
    return;
  }

  validateFrontmatterVersion(entry, name, expectedVersion, issues, 'deployment');
}

function validateSourceEntry(
  entry: AdmZip.IZipEntry,
  name: string,
  expectedVersion: string,
  issues: ValidationIssue[],
): void {
  const constrainedRoot = getConstrainedSourceRoot(name);

  if (name.startsWith(VERSIONS_DIR + '/') || name === VERSIONS_DIR) {
    issues.push(
      err(
        'ERR_ZIP_VERSIONS_INCLUDED',
        `Source ZIP must not include versions/ — found entry: "${name}"`,
      ),
    );
    return;
  }

  if (constrainedRoot !== undefined && !name.startsWith(`${constrainedRoot}/`)) {
    issues.push(
      err(
        'ERR_ZIP_UNEXPECTED_ENTRY',
        `Non-canonical case for constrained source path: "${name}" — entries must use exact directory casing "${constrainedRoot}/"`,
      ),
    );
  }

  if (constrainedRoot !== undefined && !hasAllowedZipExtension(name)) {
    issues.push(
      err(
        'ERR_ZIP_DISALLOWED_PAYLOAD',
        `Disallowed file type in source ZIP constrained paths: "${name}" — entries under agents/ and flows/ must end with one of: ${ALLOWED_ZIP_EXTENSION_SUFFIXES.join(', ')}`,
      ),
    );
  }

  if (!name.endsWith(AGENT_FILE_EXT)) {
    return;
  }

  validateFrontmatterVersion(entry, name, expectedVersion, issues, 'source');
}

const ID_SEGMENT = '[a-z0-9]+(?:-[a-z0-9]+)*';
const LEGACY_CLAUDE_AGENT_ENTRY_PATTERN = new RegExp(
  `^\\.claude/agents/${ID_SEGMENT}\\.md$`,
);
const QUALIFIED_CLAUDE_AGENT_ENTRY_PATTERN = new RegExp(
  `^\\.claude/agents/${ID_SEGMENT}/${ID_SEGMENT}/${ID_SEGMENT}\\.md$`,
);
const LEGACY_SKILL_ENTRY_PATTERN = new RegExp(
  `^(?:\\.cursor/skills|\\.agents/skills)/${ID_SEGMENT}/SKILL\\.md$`,
);
const QUALIFIED_SKILL_ENTRY_PATTERN = new RegExp(
  `^(?:\\.cursor/skills|\\.agents/skills)/${ID_SEGMENT}/${ID_SEGMENT}/${ID_SEGMENT}/SKILL\\.md$`,
);

const usesQualifiedPathEncoding = (pathEncoding?: number): boolean => {
  return pathEncoding === PATH_ENCODING_VERSION;
};

const SKILL_LEAF_SUFFIX_PATTERN = new RegExp(`/${ID_SEGMENT}/SKILL\\.md$`);

function extractInstallLeafFromSkillPath(name: string): string | undefined {
  if (!SKILL_LEAF_SUFFIX_PATTERN.test(name)) {
    return undefined;
  }
  const segments = name.split('/');
  return segments.at(-2);
}

function extractInstallLeafFromClaudePath(name: string): string | undefined {
  const segments = name.split('/');
  const fileName = segments.at(-1);
  if (fileName === undefined || !fileName.endsWith('.md')) {
    return undefined;
  }
  return fileName.slice(0, -'.md'.length);
}

function validateSkillEntry(
  entry: AdmZip.IZipEntry,
  name: string,
  issues: ValidationIssue[],
  pathEncoding?: number,
): void {
  const qualified = usesQualifiedPathEncoding(pathEncoding);
  const legacyMatch = LEGACY_SKILL_ENTRY_PATTERN.test(name);
  const qualifiedMatch = QUALIFIED_SKILL_ENTRY_PATTERN.test(name);

  if (qualified && !qualifiedMatch) {
    issues.push(
      err(
        'ERR_ZIP_UNEXPECTED_ENTRY',
        `Unexpected entry in skill target ZIP: "${name}"`,
      ),
    );
    return;
  }

  if (!qualified && !legacyMatch) {
    issues.push(
      err(
        'ERR_ZIP_UNEXPECTED_ENTRY',
        `Unexpected entry in skill target ZIP: "${name}"`,
      ),
    );
    return;
  }

  try {
    const content = entry.getData().toString('utf-8');
    const frontmatter = parseFrontmatterData(content);
    const expectedLeaf = qualified ? extractInstallLeafFromSkillPath(name) : undefined;
    if (typeof frontmatter.name !== 'string' || frontmatter.name.trim().length === 0) {
      issues.push(err('ERR_ZIP_MALFORMED_ENTRY', `Skill ZIP entry "${name}" must include frontmatter name`));
    } else if (expectedLeaf !== undefined && frontmatter.name !== expectedLeaf) {
      issues.push(
        err(
          'ERR_ZIP_MALFORMED_ENTRY',
          `Skill ZIP entry "${name}" frontmatter name must equal install leaf "${expectedLeaf}"`,
        ),
      );
    }
    if (typeof frontmatter.description !== 'string' || frontmatter.description.trim().length === 0) {
      issues.push(err('ERR_ZIP_MALFORMED_ENTRY', `Skill ZIP entry "${name}" must include frontmatter description`));
    }
  } catch {
    issues.push(err('ERR_ZIP_MALFORMED_ENTRY', `Cannot read content of skill ZIP entry: "${name}"`));
  }
}

function validateClaudeAgentEntry(
  entry: AdmZip.IZipEntry,
  name: string,
  issues: ValidationIssue[],
  pathEncoding?: number,
): void {
  const qualified = usesQualifiedPathEncoding(pathEncoding);
  const legacyMatch = LEGACY_CLAUDE_AGENT_ENTRY_PATTERN.test(name);
  const qualifiedMatch = QUALIFIED_CLAUDE_AGENT_ENTRY_PATTERN.test(name);

  if (qualified && !qualifiedMatch) {
    issues.push(err('ERR_ZIP_UNEXPECTED_ENTRY', `Unexpected entry in Claude target ZIP: "${name}"`));
    return;
  }

  if (!qualified && !legacyMatch) {
    issues.push(err('ERR_ZIP_UNEXPECTED_ENTRY', `Unexpected entry in Claude target ZIP: "${name}"`));
    return;
  }

  try {
    const content = entry.getData().toString('utf-8');
    const frontmatter = parseFrontmatterData(content);
    const expectedLeaf = qualified ? extractInstallLeafFromClaudePath(name) : undefined;
    if (typeof frontmatter.name !== 'string' || frontmatter.name.trim().length === 0) {
      issues.push(err('ERR_ZIP_MALFORMED_ENTRY', `Claude ZIP entry "${name}" must include frontmatter name`));
    } else if (expectedLeaf !== undefined && frontmatter.name !== expectedLeaf) {
      issues.push(
        err(
          'ERR_ZIP_MALFORMED_ENTRY',
          `Claude ZIP entry "${name}" frontmatter name must equal install leaf "${expectedLeaf}"`,
        ),
      );
    }
  } catch {
    issues.push(err('ERR_ZIP_MALFORMED_ENTRY', `Cannot read content of Claude ZIP entry: "${name}"`));
  }
}

type ZipEntryVisitor = (
  entry: AdmZip.IZipEntry,
  name: string,
  issues: ValidationIssue[],
) => void;

function scanZipEntries(zipPath: string, visit: ZipEntryVisitor): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipPath);
  } catch (error) {
    return [err('ERR_ZIP_MALFORMED_ENTRY', `Cannot open ZIP: ${zipPath} — ${error}`)];
  }

  const seenExact = new Set<string>();
  const seenLower = new Map<string, string>();

  for (const entry of zip.getEntries()) {
    const name = entry.entryName;
    if (name.endsWith('/')) {
      continue;
    }

    if (!validateEntryPath(name, issues)) {
      continue;
    }

    if (!validateNotSymlink(entry, name, issues)) {
      continue;
    }

    trackEntryCollisions(name, issues, seenExact, seenLower);
    visit(entry, name, issues);
  }

  return issues;
}

export function scanTargetArtifactZip(
  zipPath: string,
  targetId: InstallTargetId,
  expectedVersion: string,
  pathEncoding?: number,
): ValidationIssue[] {
  if (targetId === 'github-copilot') {
    return scanSnapshotZip(zipPath, { type: 'deployment', expectedVersion });
  }

  return scanZipEntries(zipPath, (entry, name, issues) => {
    if (targetId === 'claude-code') {
      validateFrontmatterVersion(entry, name, expectedVersion, issues, 'deployment');
      validateClaudeAgentEntry(entry, name, issues, pathEncoding);
      return;
    }

    validateSkillEntry(entry, name, issues, pathEncoding);
  });
}

export function scanSnapshotZip(
  zipPath: string,
  opts: { type: 'deployment' | 'source'; expectedVersion: string },
): ValidationIssue[] {
  return scanZipEntries(zipPath, (entry, name, issues) => {
    if (opts.type === 'deployment') {
      validatePatternedFrontmatterEntry(
        entry,
        name,
        opts.expectedVersion,
        issues,
        DEPLOYMENT_ZIP_ENTRY_PATTERN,
        `Unexpected entry in deployment ZIP: "${name}" — only agents/<id>.agent.md is allowed`,
      );
      return;
    }

    validateSourceEntry(entry, name, opts.expectedVersion, issues);
  });
}
