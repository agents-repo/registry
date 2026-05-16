import AdmZip from 'adm-zip';
import { parseFrontmatter } from '../../frontmatter';
import type { ValidationIssue } from '../../types';
import { err } from '../common/issues';

const DISALLOWED_SOURCE_EXTENSIONS = new Set([
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.sh',
  '.bash',
  '.bat',
  '.cmd',
  '.ps1',
  '.py',
  '.rb',
  '.pl',
  '.php',
  '.jar',
  '.class',
]);

export function scanSnapshotZip(
  zipPath: string,
  opts: { type: 'deployment' | 'source'; expectedVersion: string },
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  let zip: AdmZip;
  try {
    zip = new AdmZip(zipPath);
  } catch (error) {
    return [err('ERR_ZIP_MALFORMED_ENTRY', `Cannot open ZIP: ${zipPath} — ${error}`)];
  }

  const entries = zip.getEntries();
  const seenExact = new Set<string>();
  const seenLower = new Map<string, string>();

  for (const entry of entries) {
    const name = entry.entryName;

    if (name.endsWith('/')) {
      continue;
    }

    if (name.length === 0 || name.length > 4096) {
      issues.push(err('ERR_ZIP_MALFORMED_ENTRY', `Malformed ZIP entry name length: "${name}"`));
      continue;
    }

    if (
      name.includes('\0') ||
      name.split('/').some((segment) => segment === '..') ||
      name.startsWith('/') ||
      name.includes('\\')
    ) {
      issues.push(err('ERR_ZIP_TRAVERSAL', `Path traversal detected in ZIP entry: "${name}"`));
      continue;
    }

    const unixMode = (entry.attr >>> 16) & 0xffff;
    if (unixMode !== 0 && (unixMode & 0xf000) === 0xa000) {
      issues.push(err('ERR_ZIP_SYMLINK', `Symlink entry detected in ZIP: "${name}"`));
      continue;
    }

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
    } else if (firstSeen === undefined) {
      seenLower.set(lower, name);
    }

    if (opts.type === 'deployment') {
      if (!/^agents\/[a-z0-9]+(?:-[a-z0-9]+)*\.agent\.md$/.test(name)) {
        issues.push(
          err(
            'ERR_ZIP_UNEXPECTED_ENTRY',
            `Unexpected entry in deployment ZIP: "${name}" — only agents/<id>.agent.md is allowed`,
          ),
        );
        continue;
      }

      try {
        const content = entry.getData().toString('utf-8');
        const frontmatter = parseFrontmatter(content);
        if (frontmatter['version'] !== opts.expectedVersion) {
          issues.push(
            err(
              'ERR_FRONTMATTER_VERSION_MISMATCH',
              `Deployment ZIP entry "${name}": frontmatter version "${frontmatter['version']}" must be "${opts.expectedVersion}"`,
            ),
          );
        }
      } catch {
        issues.push(
          err(
            'ERR_ZIP_MALFORMED_ENTRY',
            `Cannot read content of deployment ZIP entry: "${name}"`,
          ),
        );
      }
    }

    if (opts.type === 'source') {
      if (name.startsWith('versions/') || name === 'versions') {
        issues.push(
          err(
            'ERR_ZIP_VERSIONS_INCLUDED',
            `Source ZIP must not include versions/ — found entry: "${name}"`,
          ),
        );
        continue;
      }

      const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';
      if (DISALLOWED_SOURCE_EXTENSIONS.has(ext)) {
        issues.push(
          err(
            'ERR_ZIP_DISALLOWED_PAYLOAD',
            `Disallowed file extension "${ext}" in source ZIP: "${name}"`,
          ),
        );
      }

      if (name.endsWith('.agent.md')) {
        try {
          const content = entry.getData().toString('utf-8');
          const frontmatter = parseFrontmatter(content);
          if (frontmatter['version'] !== opts.expectedVersion) {
            issues.push(
              err(
                'ERR_FRONTMATTER_VERSION_MISMATCH',
                `Source ZIP entry "${name}": frontmatter version "${frontmatter['version']}" must be "${opts.expectedVersion}"`,
              ),
            );
          }
        } catch {
          issues.push(
            err('ERR_ZIP_MALFORMED_ENTRY', `Cannot read content of source ZIP entry: "${name}"`),
          );
        }
      }
    }
  }

  return issues;
}
