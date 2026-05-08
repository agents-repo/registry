import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { Checksum } from './checksum';
import { parseFrontmatter } from './frontmatter';
import { describeSchemaVersionStatus, getSchemaCurrentVersion } from './schema-versions';
import type { Manifest, ValidationIssue, ValidationReport } from './types';

export class SnapshotValidator {
  private readonly packageId: string;
  private readonly version: string;
  private readonly packagesDir: string;

  private static readonly DISALLOWED_SOURCE_EXTENSIONS = new Set([
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

  constructor(packageId: string, version: string, packagesDir: string) {
    this.packageId = packageId;
    this.version = version;
    this.packagesDir = packagesDir;
  }

  validate(): ValidationReport {
    const issues: ValidationIssue[] = [];
    const packageDir = path.join(this.packagesDir, this.packageId);
    const versionDir = path.join(packageDir, 'versions', this.version);
    const manifestPath = path.join(packageDir, 'versions', 'manifest.json');

    // 1. Version directory exists
    if (!fs.existsSync(versionDir)) {
      return {
        packageId: this.packageId,
        errors: [
          this.err(
            'ERR_PACKAGE_NOT_FOUND',
            `Version snapshot directory not found: ${versionDir}`,
          ),
        ],
        warnings: [],
        passed: false,
      };
    }

    const deployZipPath = path.join(versionDir, `${this.version}.zip`);
    const srcZipPath = path.join(versionDir, `${this.version}-src.zip`);
    const snapshotMetaPath = path.join(versionDir, 'metadata.json');

    // 2. Expected files present
    if (!fs.existsSync(deployZipPath)) {
      issues.push(this.err('ERR_VALIDATION_FAILED', `Missing deployment ZIP: ${this.version}.zip`));
    }
    if (!fs.existsSync(srcZipPath)) {
      issues.push(this.err('ERR_VALIDATION_FAILED', `Missing source archive: ${this.version}-src.zip`));
    }
    if (!fs.existsSync(snapshotMetaPath)) {
      issues.push(this.err('ERR_VALIDATION_FAILED', `Missing snapshot metadata.json`));
    } else {
      try {
        const snapshotMeta = JSON.parse(fs.readFileSync(snapshotMetaPath, 'utf-8')) as Record<string, unknown>;
        issues.push(...this.validateSchemaVersion(snapshotMeta['schemaVersion'], 'Snapshot metadata.json'));
      } catch {
        issues.push(this.err('ERR_VALIDATION_FAILED', `Snapshot metadata.json is not valid JSON`));
      }
    }

    // 3. No unexpected files in the version snapshot directory
    const allowedTopLevelEntries = new Set([
      'metadata.json',
      `${this.version}.zip`,
      `${this.version}-src.zip`,
      'agents',
      'flows',
    ]);
    for (const entry of fs.readdirSync(versionDir)) {
      if (!allowedTopLevelEntries.has(entry)) {
        issues.push(
          this.err(
            'ERR_MANUAL_MUTATION',
            `Unexpected file in version snapshot directory: "${entry}" — only script-generated files are allowed`,
          ),
        );
      }
    }

    // 4. Manifest exists and contains this version
    if (!fs.existsSync(manifestPath)) {
      issues.push(this.err('ERR_VALIDATION_FAILED', `versions/manifest.json not found`));
    } else {
      let manifest: Manifest;
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
      } catch {
        issues.push(this.err('ERR_VALIDATION_FAILED', `versions/manifest.json is not valid JSON`));
        const errors = issues.filter((i) => i.severity === 'error');
        const warnings = issues.filter((i) => i.severity === 'warning');
        return { packageId: this.packageId, errors, warnings, passed: errors.length === 0 };
      }

      const entry = manifest.versions.find((v) => v.version === this.version);
      if (!entry) {
        issues.push(
          this.err(
            'ERR_VALIDATION_FAILED',
            `Version "${this.version}" not found in manifest.json`,
          ),
        );
      } else {
        // 5. Checksum verification
        if (fs.existsSync(deployZipPath)) {
          const actualDeployHash = Checksum.sha256(deployZipPath);
          if (actualDeployHash !== entry.sha256) {
            issues.push(
              this.err(
                'ERR_CHECKSUM_MISMATCH',
                `Deployment ZIP sha256 mismatch for version "${this.version}": ` +
                  `manifest has "${entry.sha256}", computed "${actualDeployHash}"`,
              ),
            );
          }
        }

        if (fs.existsSync(srcZipPath)) {
          const actualSrcHash = Checksum.sha256(srcZipPath);
          if (actualSrcHash !== entry.srcSha256) {
            issues.push(
              this.err(
                'ERR_CHECKSUM_MISMATCH',
                `Source archive sha256 mismatch for version "${this.version}": ` +
                  `manifest has "${entry.srcSha256}", computed "${actualSrcHash}"`,
              ),
            );
          }
        }
      }
    }

    // 6. Deep deployment ZIP scan
    if (fs.existsSync(deployZipPath)) {
      issues.push(...this.scanZip(deployZipPath, { type: 'deployment', expectedVersion: this.version }));
    }

    // 7. Deep source archive scan
    if (fs.existsSync(srcZipPath)) {
      issues.push(...this.scanZip(srcZipPath, { type: 'source', expectedVersion: this.version }));
    }

    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');
    return { packageId: this.packageId, errors, warnings, passed: errors.length === 0 };
  }

  private err(code: string, message: string): ValidationIssue {
    return { code, severity: 'error', message };
  }

  private warn(message: string): ValidationIssue {
    return { code: 'WARN', severity: 'warning', message };
  }

  private validateSchemaVersion(value: unknown, context: string): ValidationIssue[] {
    const result = describeSchemaVersionStatus('metadata.package', value);
    const current = getSchemaCurrentVersion('metadata.package');
    const supported = result.expected.join(', ');

    if (result.status === 'deprecated') {
      return [
        this.warn(
          `${context}: schemaVersion ${JSON.stringify(value)} is deprecated; current is ${JSON.stringify(current)}.`,
        ),
      ];
    }
    if (result.status === 'eol') {
      return [
        this.err(
          'ERR_METADATA_INVALID',
          `${context}: schemaVersion ${JSON.stringify(value)} is end-of-life; supported versions are [${supported}].`,
        ),
      ];
    }
    if (result.status === 'unsupported') {
      return [
        this.err(
          'ERR_METADATA_INVALID',
          `${context}: unsupported schemaVersion ${JSON.stringify(value)}; supported versions are [${supported}].`,
        ),
      ];
    }
    return [];
  }

  private scanZip(
    zipPath: string,
    opts: { type: 'deployment' | 'source'; expectedVersion: string },
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    let zip: AdmZip;
    try {
      zip = new AdmZip(zipPath);
    } catch (e) {
      return [this.err('ERR_ZIP_MALFORMED_ENTRY', `Cannot open ZIP: ${zipPath} — ${e}`)];
    }

    const entries = zip.getEntries();
    const seenExact = new Set<string>();
    const seenLower = new Set<string>();

    for (const entry of entries) {
      const name = entry.entryName;

      if (name.endsWith('/')) continue;

      if (name.length === 0 || name.length > 4096) {
        issues.push(this.err('ERR_ZIP_MALFORMED_ENTRY', `Malformed ZIP entry name length: "${name}"`));
        continue;
      }

      if (
        name.includes('\0') ||
        name.split('/').some((seg) => seg === '..') ||
        name.startsWith('/') ||
        name.includes('\\')
      ) {
        issues.push(
          this.err('ERR_ZIP_TRAVERSAL', `Path traversal detected in ZIP entry: "${name}"`),
        );
        continue;
      }

      const unixMode = (entry.attr >>> 16) & 0xffff;
      if (unixMode !== 0 && (unixMode & 0xf000) === 0xa000) {
        issues.push(
          this.err('ERR_ZIP_SYMLINK', `Symlink entry detected in ZIP: "${name}"`),
        );
        continue;
      }

      if (seenExact.has(name)) {
        issues.push(this.err('ERR_ZIP_COLLISION', `Duplicate ZIP entry: "${name}"`));
      } else {
        seenExact.add(name);
      }

      const lower = name.toLowerCase();
      if (seenLower.has(lower) && !seenExact.has(name)) {
        issues.push(
          this.err(
            'ERR_ZIP_COLLISION',
            `Case-collision ZIP entry: "${name}" collides with an existing entry`,
          ),
        );
      }
      seenLower.add(lower);

      if (opts.type === 'deployment') {
        if (!/^agents\/[a-z0-9]+(?:-[a-z0-9]+)*\.agent\.md$/.test(name)) {
          issues.push(
            this.err(
              'ERR_ZIP_UNEXPECTED_ENTRY',
              `Unexpected entry in deployment ZIP: "${name}" — only agents/<id>.agent.md is allowed`,
            ),
          );
          continue;
        }

        try {
          const content = entry.getData().toString('utf-8');
          const fm = parseFrontmatter(content);
          if (fm['version'] !== opts.expectedVersion) {
            issues.push(
              this.err(
                'ERR_FRONTMATTER_VERSION_MISMATCH',
                `Deployment ZIP entry "${name}": frontmatter version "${fm['version']}" must be "${opts.expectedVersion}"`,
              ),
            );
          }
        } catch {
          issues.push(
            this.err(
              'ERR_ZIP_MALFORMED_ENTRY',
              `Cannot read content of deployment ZIP entry: "${name}"`,
            ),
          );
        }
      }

      if (opts.type === 'source') {
        if (name.startsWith('versions/') || name === 'versions') {
          issues.push(
            this.err(
              'ERR_ZIP_VERSIONS_INCLUDED',
              `Source ZIP must not include versions/ — found entry: "${name}"`,
            ),
          );
          continue;
        }

        const ext = name.includes('.')
          ? name.slice(name.lastIndexOf('.')).toLowerCase()
          : '';
        if (SnapshotValidator.DISALLOWED_SOURCE_EXTENSIONS.has(ext)) {
          issues.push(
            this.err(
              'ERR_ZIP_DISALLOWED_PAYLOAD',
              `Disallowed file extension "${ext}" in source ZIP: "${name}"`,
            ),
          );
        }

        if (name.endsWith('.agent.md')) {
          try {
            const content = entry.getData().toString('utf-8');
            const fm = parseFrontmatter(content);
            if (fm['version'] !== opts.expectedVersion) {
              issues.push(
                this.err(
                  'ERR_FRONTMATTER_VERSION_MISMATCH',
                  `Source ZIP entry "${name}": frontmatter version "${fm['version']}" must be "${opts.expectedVersion}"`,
                ),
              );
            }
          } catch {
            issues.push(
              this.err(
                'ERR_ZIP_MALFORMED_ENTRY',
                `Cannot read content of source ZIP entry: "${name}"`,
              ),
            );
          }
        }
      }
    }

    return issues;
  }
}
