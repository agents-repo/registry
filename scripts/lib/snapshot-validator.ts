import fs from 'node:fs';
import path from 'node:path';
import { Checksum } from './checksum';
import type { Manifest, ValidationIssue, ValidationReport } from './types';
import { err, splitIssues } from './validators/common/issues';
import { validateSchemaVersion } from './validators/snapshot/schema-version';
import { scanSnapshotZip } from './validators/snapshot/zip-scan';

export class SnapshotValidator {
  private readonly packageId: string;
  private readonly version: string;
  private readonly packagesDir: string;

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
          err(
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
      issues.push(err('ERR_VALIDATION_FAILED', `Missing deployment ZIP: ${this.version}.zip`));
    }
    if (!fs.existsSync(srcZipPath)) {
      issues.push(err('ERR_VALIDATION_FAILED', `Missing source archive: ${this.version}-src.zip`));
    }
    if (!fs.existsSync(snapshotMetaPath)) {
      issues.push(err('ERR_VALIDATION_FAILED', `Missing snapshot metadata.json`));
    } else {
      try {
        const snapshotMeta = JSON.parse(fs.readFileSync(snapshotMetaPath, 'utf-8')) as Record<string, unknown>;
        issues.push(...validateSchemaVersion(snapshotMeta['schemaVersion'], 'Snapshot metadata.json'));
      } catch {
        issues.push(err('ERR_VALIDATION_FAILED', `Snapshot metadata.json is not valid JSON`));
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
          err(
            'ERR_MANUAL_MUTATION',
            `Unexpected file in version snapshot directory: "${entry}" — only script-generated files are allowed`,
          ),
        );
      }
    }

    // 4. Manifest exists and contains this version
    if (!fs.existsSync(manifestPath)) {
      issues.push(err('ERR_VALIDATION_FAILED', `versions/manifest.json not found`));
    } else {
      let manifest: Manifest;
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
      } catch {
        issues.push(err('ERR_VALIDATION_FAILED', `versions/manifest.json is not valid JSON`));
        const { errors, warnings } = splitIssues(issues);
        return { packageId: this.packageId, errors, warnings, passed: errors.length === 0 };
      }

      issues.push(
        ...validateSchemaVersion(
          manifest.schemaVersion,
          'versions/manifest.json',
          'manifest',
          'ERR_VALIDATION_FAILED',
        ),
      );

      const entry = manifest.versions.find((v) => v.version === this.version);
      if (!entry) {
        issues.push(
          err(
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
              err(
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
              err(
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
      issues.push(...scanSnapshotZip(deployZipPath, { type: 'deployment', expectedVersion: this.version }));
    }

    // 7. Deep source archive scan
    if (fs.existsSync(srcZipPath)) {
      issues.push(...scanSnapshotZip(srcZipPath, { type: 'source', expectedVersion: this.version }));
    }

    const { errors, warnings } = splitIssues(issues);
    return { packageId: this.packageId, errors, warnings, passed: errors.length === 0 };
  }
}
