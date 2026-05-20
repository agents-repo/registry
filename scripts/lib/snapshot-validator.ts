import fs from 'node:fs';
import path from 'node:path';
import { Checksum } from './checksum';
import type { Manifest, ValidationIssue, ValidationReport } from './types';
import { err, splitIssues } from './validators/common/issues';
import { validateSchemaVersion } from './validators/snapshot/schema-version';
import { scanSnapshotZip } from './validators/snapshot/zip-scan';
import {
  AGENTS_DIR,
  FLOWS_DIR,
  MANIFEST_FILENAME,
  METADATA_FILENAME,
  SOURCE_ARCHIVE_SUFFIX,
  VERSIONS_DIR,
} from './constants';

export class SnapshotValidator {
  private readonly packageId: string;
  private readonly version: string;
  private readonly packagesDir: string;

  constructor(packageId: string, version: string, packagesDir: string) {
    this.packageId = packageId;
    this.version = version;
    this.packagesDir = packagesDir;
  }

  private getPaths(): {
    versionDir: string;
    manifestPath: string;
    deployZipPath: string;
    srcZipPath: string;
    snapshotMetaPath: string;
  } {
    const packageDir = path.join(this.packagesDir, this.packageId);
    const versionDir = path.join(packageDir, VERSIONS_DIR, this.version);

    return {
      versionDir,
      manifestPath: path.join(packageDir, VERSIONS_DIR, MANIFEST_FILENAME),
      deployZipPath: path.join(versionDir, `${this.version}.zip`),
      srcZipPath: path.join(versionDir, `${this.version}${SOURCE_ARCHIVE_SUFFIX}`),
      snapshotMetaPath: path.join(versionDir, METADATA_FILENAME),
    };
  }

  private validateSnapshotMetadata(snapshotMetaPath: string, issues: ValidationIssue[]): void {
    if (!fs.existsSync(snapshotMetaPath)) {
      issues.push(err('ERR_VALIDATION_FAILED', `Missing snapshot ${METADATA_FILENAME}`));
      return;
    }

    try {
      const snapshotMeta = JSON.parse(fs.readFileSync(snapshotMetaPath, 'utf-8')) as Record<string, unknown>;
      issues.push(...validateSchemaVersion(snapshotMeta['schemaVersion'], `Snapshot ${METADATA_FILENAME}`));
    } catch {
      issues.push(err('ERR_VALIDATION_FAILED', `Snapshot ${METADATA_FILENAME} is not valid JSON`));
    }
  }

  private validateRequiredSnapshotFiles(
    deployZipPath: string,
    srcZipPath: string,
    snapshotMetaPath: string,
    issues: ValidationIssue[],
  ): void {
    if (!fs.existsSync(deployZipPath)) {
      issues.push(err('ERR_VALIDATION_FAILED', `Missing deployment ZIP: ${this.version}.zip`));
    }

    if (!fs.existsSync(srcZipPath)) {
      issues.push(err('ERR_VALIDATION_FAILED', `Missing source archive: ${this.version}${SOURCE_ARCHIVE_SUFFIX}`));
    }

    this.validateSnapshotMetadata(snapshotMetaPath, issues);
  }

  private validateVersionDirEntries(versionDir: string, issues: ValidationIssue[]): void {
    const allowedTopLevelEntries = new Set([
      METADATA_FILENAME,
      `${this.version}.zip`,
      `${this.version}${SOURCE_ARCHIVE_SUFFIX}`,
      AGENTS_DIR,
      FLOWS_DIR,
    ]);

    for (const entry of fs.readdirSync(versionDir)) {
      if (allowedTopLevelEntries.has(entry)) {
        continue;
      }

      issues.push(
        err(
          'ERR_MANUAL_MUTATION',
          `Unexpected file in version snapshot directory: "${entry}" — only script-generated files are allowed`,
        ),
      );
    }
  }

  private verifyManifestChecksums(
    entry: Manifest['versions'][number],
    deployZipPath: string,
    srcZipPath: string,
    issues: ValidationIssue[],
  ): void {
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

  private validateManifestAndChecksums(
    manifestPath: string,
    deployZipPath: string,
    srcZipPath: string,
    issues: ValidationIssue[],
  ): void {
    if (!fs.existsSync(manifestPath)) {
      issues.push(err('ERR_VALIDATION_FAILED', `${VERSIONS_DIR}/${MANIFEST_FILENAME} not found`));
      return;
    }

    let manifest: Manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
    } catch {
      issues.push(err('ERR_VALIDATION_FAILED', `${VERSIONS_DIR}/${MANIFEST_FILENAME} is not valid JSON`));
      return;
    }

    issues.push(
      ...validateSchemaVersion(
        manifest.schemaVersion,
        `${VERSIONS_DIR}/${MANIFEST_FILENAME}`,
        'manifest',
        'ERR_VALIDATION_FAILED',
      ),
    );

    const entry = manifest.versions.find((versionEntry) => versionEntry.version === this.version);
    if (!entry) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `Version "${this.version}" not found in ${MANIFEST_FILENAME}`,
        ),
      );
      return;
    }

    this.verifyManifestChecksums(entry, deployZipPath, srcZipPath, issues);
  }

  validate(): ValidationReport {
    const issues: ValidationIssue[] = [];
    const { versionDir, manifestPath, deployZipPath, srcZipPath, snapshotMetaPath } = this.getPaths();

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

    this.validateRequiredSnapshotFiles(deployZipPath, srcZipPath, snapshotMetaPath, issues);

    // 3. No unexpected files in the version snapshot directory
    this.validateVersionDirEntries(versionDir, issues);

    // 4. Manifest exists and contains this version
    this.validateManifestAndChecksums(manifestPath, deployZipPath, srcZipPath, issues);

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
