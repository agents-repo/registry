import fs from 'fs';
import path from 'path';
import semver from 'semver';
import { parseFrontmatter } from './frontmatter';
import type {
  Manifest,
  PackageMetadata,
  ValidationIssue,
  ValidationReport,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function err(code: string, message: string): ValidationIssue {
  return { code, severity: 'error', message };
}

function warn(message: string): ValidationIssue {
  return { code: 'WARN', severity: 'warning', message };
}

function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

const RFC3339_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function isRfc3339(value: string): boolean {
  return RFC3339_RE.test(value);
}

function readJsonFile(
  filePath: string,
): { data: unknown; error?: string } {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return { data: null, error: `Cannot read file: ${filePath}` };
  }
  try {
    return { data: JSON.parse(raw) };
  } catch {
    return { data: null, error: `Invalid JSON in file: ${filePath}` };
  }
}

// ---------------------------------------------------------------------------
// Package metadata validation
// ---------------------------------------------------------------------------

function validateMetadata(
  metadata: unknown,
  packageId: string,
  issues: ValidationIssue[],
): metadata is PackageMetadata {
  if (typeof metadata !== 'object' || metadata === null) {
    issues.push(err('ERR_METADATA_INVALID', 'metadata.json must be a JSON object'));
    return false;
  }

  const m = metadata as Record<string, unknown>;

  if (m['schemaVersion'] !== '1.0.0') {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `schemaVersion must be "1.0.0", got: ${JSON.stringify(m['schemaVersion'])}`,
      ),
    );
  }

  if (typeof m['name'] !== 'string' || m['name'] !== packageId) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `name must equal the package directory name "${packageId}", got: ${JSON.stringify(m['name'])}`,
      ),
    );
  }

  if (
    typeof m['description'] !== 'string' ||
    m['description'].length < 1 ||
    m['description'].length > 300
  ) {
    issues.push(
      err('ERR_METADATA_INVALID', 'description must be a string of 1 to 300 characters'),
    );
  }

  if (typeof m['owner'] !== 'string' || m['owner'].length === 0) {
    issues.push(err('ERR_METADATA_INVALID', 'owner must be a non-empty string'));
  }

  if (m['license'] !== 'MIT') {
    issues.push(
      err('ERR_METADATA_INVALID', `license must be "MIT", got: ${JSON.stringify(m['license'])}`),
    );
  }

  if (typeof m['homepage'] !== 'string' || !isHttpsUrl(m['homepage'])) {
    issues.push(
      err('ERR_METADATA_INVALID', `homepage must be an HTTPS URL, got: ${JSON.stringify(m['homepage'])}`),
    );
  }

  if (typeof m['repository'] !== 'string' || !isHttpsUrl(m['repository'])) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `repository must be an HTTPS URL, got: ${JSON.stringify(m['repository'])}`,
      ),
    );
  }

  if (!Array.isArray(m['tags']) || m['tags'].length < 1 || m['tags'].length > 20) {
    issues.push(err('ERR_METADATA_INVALID', 'tags must be an array of 1 to 20 strings'));
  } else {
    for (const tag of m['tags'] as unknown[]) {
      if (typeof tag !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(tag)) {
        issues.push(
          err('ERR_METADATA_INVALID', `Each tag must be a lowercase string, got: ${JSON.stringify(tag)}`),
        );
      }
    }
    const dupes = (m['tags'] as string[]).filter(
      (t, i, a) => a.indexOf(t) !== i,
    );
    if (dupes.length > 0) {
      issues.push(err('ERR_METADATA_INVALID', `Duplicate tags: ${dupes.join(', ')}`));
    }
  }

  if (typeof m['createdAt'] !== 'string' || !isRfc3339(m['createdAt'])) {
    issues.push(err('ERR_METADATA_INVALID', 'createdAt must be an RFC 3339 timestamp'));
  }

  if (typeof m['updatedAt'] !== 'string' || !isRfc3339(m['updatedAt'])) {
    issues.push(err('ERR_METADATA_INVALID', 'updatedAt must be an RFC 3339 timestamp'));
  } else if (
    typeof m['createdAt'] === 'string' &&
    isRfc3339(m['createdAt']) &&
    m['updatedAt'] < m['createdAt']
  ) {
    issues.push(
      err('ERR_METADATA_INVALID', 'updatedAt must be greater than or equal to createdAt'),
    );
  }

  if (
    typeof m['version'] !== 'string' ||
    !semver.valid(m['version']) ||
    m['version'] !== semver.clean(m['version'])
  ) {
    issues.push(
      err(
        'ERR_METADATA_INVALID',
        `version must be a valid semantic version (MAJOR.MINOR.PATCH), got: ${JSON.stringify(m['version'])}`,
      ),
    );
  }

  return issues.filter((i) => i.severity === 'error').length === 0;
}

// ---------------------------------------------------------------------------
// Agent / flow entry validation
// ---------------------------------------------------------------------------

function validateEntryFiles(
  entryDir: string,
  dirLabel: string,
  issues: ValidationIssue[],
): Array<{ id: string; frontmatterVersion: string }> {
  const entries: Array<{ id: string; frontmatterVersion: string }> = [];

  if (!fs.existsSync(entryDir)) return entries;

  const files = fs.readdirSync(entryDir);
  const agentMdFiles = files.filter((f) => f.endsWith('.agent.md'));

  for (const mdFile of agentMdFiles) {
    const stem = mdFile.replace(/\.agent\.md$/, '');
    const mdPath = path.join(entryDir, mdFile);
    const metaPath = path.join(entryDir, `${stem}.metadata.json`);

    if (!fs.existsSync(metaPath)) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `${dirLabel}/${stem}.metadata.json is missing (required for ${mdFile})`,
        ),
      );
    }

    const content = fs.readFileSync(mdPath, 'utf-8');
    const fm = parseFrontmatter(content);

    if (!fm['name'] || fm['name'] !== stem) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `${dirLabel}/${mdFile}: frontmatter name "${fm['name']}" must equal stem "${stem}"`,
        ),
      );
    }

    if (!fm['version'] || !semver.valid(fm['version'])) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `${dirLabel}/${mdFile}: frontmatter version must be a valid semver, got: ${JSON.stringify(fm['version'])}`,
        ),
      );
    }

    if (fm['license'] && fm['license'] !== 'MIT') {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `${dirLabel}/${mdFile}: frontmatter license must be "MIT", got: ${JSON.stringify(fm['license'])}`,
        ),
      );
    }

    if (fm['description'] && fm['description'].length > 300) {
      issues.push(
        warn(
          `${dirLabel}/${mdFile}: frontmatter description exceeds 300 characters`,
        ),
      );
    }

    entries.push({ id: stem, frontmatterVersion: fm['version'] ?? '' });
  }

  // Check for orphaned .metadata.json files (no matching .agent.md)
  const metaFiles = files.filter(
    (f) => f.endsWith('.metadata.json') && !f.startsWith('.'),
  );
  for (const mf of metaFiles) {
    const stem = mf.replace(/\.metadata\.json$/, '');
    if (!agentMdFiles.includes(`${stem}.agent.md`)) {
      issues.push(
        warn(
          `${dirLabel}/${mf}: found .metadata.json with no matching .agent.md`,
        ),
      );
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Manifest validation
// ---------------------------------------------------------------------------

function validateManifest(
  manifestPath: string,
  packageId: string,
  issues: ValidationIssue[],
): Manifest | null {
  const { data, error } = readJsonFile(manifestPath);
  if (error) {
    issues.push(err('ERR_VALIDATION_FAILED', error));
    return null;
  }

  const m = data as Record<string, unknown>;

  if (m['schemaVersion'] !== '1.0.0') {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json schemaVersion must be "1.0.0", got: ${JSON.stringify(m['schemaVersion'])}`,
      ),
    );
  }

  if (typeof m['name'] !== 'string' || m['name'] !== packageId) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        `manifest.json name must equal "${packageId}", got: ${JSON.stringify(m['name'])}`,
      ),
    );
  }

  if (typeof m['latest'] !== 'string' || !semver.valid(m['latest'])) {
    issues.push(
      err('ERR_VALIDATION_FAILED', `manifest.json latest must be a valid semver`),
    );
  }

  if (!Array.isArray(m['versions']) || m['versions'].length === 0) {
    issues.push(
      err('ERR_VALIDATION_FAILED', 'manifest.json versions must be a non-empty array'),
    );
    return m as unknown as Manifest;
  }

  const versionSet = new Set<string>();
  for (const entry of m['versions'] as unknown[]) {
    if (typeof entry !== 'object' || entry === null) {
      issues.push(err('ERR_VALIDATION_FAILED', 'manifest.json versions entries must be objects'));
      continue;
    }

    const e = entry as Record<string, unknown>;
    const ver = e['version'] as string;

    if (typeof ver !== 'string' || !semver.valid(ver)) {
      issues.push(
        err('ERR_VALIDATION_FAILED', `manifest.json version entry "version" must be valid semver`),
      );
    } else {
      if (versionSet.has(ver)) {
        issues.push(
          err('ERR_VALIDATION_FAILED', `manifest.json duplicate version entry: ${ver}`),
        );
      }
      versionSet.add(ver);

      if (e['artifact'] !== `${ver}.zip`) {
        issues.push(
          err(
            'ERR_VALIDATION_FAILED',
            `manifest.json version ${ver}: artifact must be "${ver}.zip"`,
          ),
        );
      }

      if (e['srcArtifact'] !== `${ver}-src.zip`) {
        issues.push(
          err(
            'ERR_VALIDATION_FAILED',
            `manifest.json version ${ver}: srcArtifact must be "${ver}-src.zip"`,
          ),
        );
      }

      if (
        typeof e['sha256'] !== 'string' ||
        !/^[0-9a-f]{64}$/.test(e['sha256'])
      ) {
        issues.push(
          err(
            'ERR_VALIDATION_FAILED',
            `manifest.json version ${ver}: sha256 must be 64 lowercase hex characters`,
          ),
        );
      }

      if (
        typeof e['srcSha256'] !== 'string' ||
        !/^[0-9a-f]{64}$/.test(e['srcSha256'])
      ) {
        issues.push(
          err(
            'ERR_VALIDATION_FAILED',
            `manifest.json version ${ver}: srcSha256 must be 64 lowercase hex characters`,
          ),
        );
      }

      if (typeof e['createdAt'] !== 'string' || !isRfc3339(e['createdAt'])) {
        issues.push(
          err(
            'ERR_VALIDATION_FAILED',
            `manifest.json version ${ver}: createdAt must be an RFC 3339 timestamp`,
          ),
        );
      }
    }
  }

  // Check latest equals max version
  if (
    typeof m['latest'] === 'string' &&
    semver.valid(m['latest']) &&
    versionSet.size > 0
  ) {
    const versions = Array.from(versionSet);
    const maxVer = semver.maxSatisfying(versions, '*');
    if (maxVer !== m['latest']) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `manifest.json latest "${m['latest']}" must equal the maximum version "${maxVer}"`,
        ),
      );
    }
  }

  return m as unknown as Manifest;
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export function validatePackage(
  packageId: string,
  packagesDir: string,
): ValidationReport {
  const issues: ValidationIssue[] = [];
  const packageDir = path.join(packagesDir, packageId);

  // 1. Package directory exists
  if (!fs.existsSync(packageDir)) {
    return {
      packageId,
      errors: [
        {
          code: 'ERR_PACKAGE_NOT_FOUND',
          severity: 'error',
          message: `Package directory not found: ${packageDir}`,
        },
      ],
      warnings: [],
      passed: false,
    };
  }

  // 2. metadata.json
  const metadataPath = path.join(packageDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    issues.push(err('ERR_METADATA_INVALID', 'metadata.json is missing from package root'));
  } else {
    const { data, error } = readJsonFile(metadataPath);
    if (error) {
      issues.push(err('ERR_METADATA_INVALID', error));
    } else {
      validateMetadata(data, packageId, issues);

      // Check metadata.version >= manifest latest (if manifest exists)
      const manifestPath = path.join(packageDir, 'versions', 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const { data: mfData } = readJsonFile(manifestPath);
        if (
          mfData &&
          typeof (mfData as Record<string, unknown>)['latest'] === 'string'
        ) {
          const metaVersion = (data as Record<string, unknown>)['version'] as string;
          const manifestLatest = (mfData as Record<string, unknown>)['latest'] as string;
          if (
            semver.valid(metaVersion) &&
            semver.valid(manifestLatest) &&
            semver.lt(metaVersion, manifestLatest)
          ) {
            issues.push(
              err(
                'ERR_METADATA_INVALID',
                `metadata.json version "${metaVersion}" must be >= manifest latest "${manifestLatest}"`,
              ),
            );
          }
        }
      }
    }
  }

  // 3. Agent and flow entries
  const agentsDir = path.join(packageDir, 'agents');
  const flowsDir = path.join(packageDir, 'flows');

  const agentEntries = validateEntryFiles(agentsDir, 'agents', issues);
  const flowEntries = validateEntryFiles(flowsDir, 'flows', issues);

  // 4. At least one agent or flow
  if (agentEntries.length === 0 && flowEntries.length === 0) {
    issues.push(
      err(
        'ERR_VALIDATION_FAILED',
        'Package must contain at least one agent (agents/) or flow (flows/)',
      ),
    );
  }

  // 5. Unique IDs across agents and flows
  const agentIds = new Set(agentEntries.map((e) => e.id));
  for (const flow of flowEntries) {
    if (agentIds.has(flow.id)) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `ID "${flow.id}" is used in both agents/ and flows/; IDs must be unique across both`,
        ),
      );
    }
  }

  // 6. Shared frontmatter version consistency
  const allVersions = [
    ...agentEntries.map((e) => e.frontmatterVersion),
    ...flowEntries.map((e) => e.frontmatterVersion),
  ].filter(Boolean);

  if (allVersions.length > 1) {
    const unique = new Set(allVersions);
    if (unique.size > 1) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `All .agent.md files must share one identical frontmatter version; found: ${Array.from(unique).join(', ')}`,
        ),
      );
    }
  }

  // 7. Manifest validation (if present)
  const manifestPath = path.join(packageDir, 'versions', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    validateManifest(manifestPath, packageId, issues);
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return {
    packageId,
    errors,
    warnings,
    passed: errors.length === 0,
  };
}
