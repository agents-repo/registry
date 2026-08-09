import fs from 'node:fs';
import path from 'node:path';
import { Checksum } from './checksum';
import type { Manifest, PackageMetadata, ValidationIssue, ValidationReport } from './types';
import { validateCompatibilityManifestAlignment } from './validators/package/compatibility-consistency';
import { err, splitIssues } from './validators/common/issues';
import { validateSchemaVersion } from './validators/snapshot/schema-version';
import { scanSnapshotZip, scanTargetArtifactZip } from './validators/snapshot/zip-scan';
import {
  AGENTS_DIR,
  FLOWS_DIR,
  MANIFEST_FILENAME,
  INSTRUCTIONS_FILENAME,
  METADATA_FILENAME,
  SOURCE_ARCHIVE_SUFFIX,
  TARGET_ARTIFACT_FILE_PATTERN,
  VERSIONS_DIR,
  SHA256_PATTERN,
} from './constants';
import { resolvePackageDir } from './namespace';

export class SnapshotValidator {
  private readonly qualifiedRef: string;
  private readonly leafPackageId: string;
  private readonly version: string;
  private readonly packagesDir: string;
  private readonly packageDir: string;

  constructor(qualifiedRef: string, version: string, packagesDir: string) {
    this.qualifiedRef = qualifiedRef;
    const resolved = resolvePackageDir(qualifiedRef, packagesDir);
    this.leafPackageId = resolved.ref.packageId;
    this.packageDir = resolved.packageDir;
    this.version = version;
    this.packagesDir = packagesDir;
  }

  private getPaths(): {
    versionDir: string;
    manifestPath: string;
    srcZipPath: string;
    snapshotMetaPath: string;
    } {
    const versionDir = path.join(this.packageDir, VERSIONS_DIR, this.version);

    return {
      versionDir,
      manifestPath: path.join(this.packageDir, VERSIONS_DIR, MANIFEST_FILENAME),
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
    srcZipPath: string,
    snapshotMetaPath: string,
    issues: ValidationIssue[],
  ): void {
    if (!fs.existsSync(srcZipPath)) {
      issues.push(err('ERR_VALIDATION_FAILED', `Missing source archive: ${this.version}${SOURCE_ARCHIVE_SUFFIX}`));
    }

    this.validateSnapshotMetadata(snapshotMetaPath, issues);
  }

  private peekManifestVersionEntry(manifestPath: string): Manifest['versions'][number] | undefined {
    if (!fs.existsSync(manifestPath)) {
      return undefined;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
      return manifest.versions.find((versionEntry) => versionEntry.version === this.version);
    } catch {
      return undefined;
    }
  }

  private validateVersionDirEntries(
    versionDir: string,
    issues: ValidationIssue[],
    allowInstructionsFile: boolean,
  ): void {
    const allowedTopLevelEntries = new Set([
      METADATA_FILENAME,
      `${this.version}${SOURCE_ARCHIVE_SUFFIX}`,
      AGENTS_DIR,
      FLOWS_DIR,
    ]);

    if (allowInstructionsFile) {
      allowedTopLevelEntries.add(INSTRUCTIONS_FILENAME);
    }

    for (const entry of fs.readdirSync(versionDir)) {
      if (allowedTopLevelEntries.has(entry) || TARGET_ARTIFACT_FILE_PATTERN.test(entry)) {
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

  private verifyTargetArtifacts(
    entry: Manifest['versions'][number],
    versionDir: string,
    issues: ValidationIssue[],
  ): void {
    for (const artifact of entry.artifacts) {
      const artifactPath = path.join(versionDir, artifact.file);
      if (!fs.existsSync(artifactPath)) {
        issues.push(
          err(
            'ERR_VALIDATION_FAILED',
            `Missing target artifact ZIP: ${artifact.file}`,
          ),
        );
        continue;
      }

      const actualHash = Checksum.sha256(artifactPath);
      if (actualHash !== artifact.sha256) {
        issues.push(
          err(
            'ERR_CHECKSUM_MISMATCH',
            `Target artifact sha256 mismatch for "${artifact.file}": ` +
              `manifest has "${artifact.sha256}", computed "${actualHash}"`,
          ),
        );
      }

      issues.push(...scanTargetArtifactZip(artifactPath, artifact.target, this.version));
    }
  }

  private verifySourceArchiveChecksum(
    entry: Manifest['versions'][number],
    srcZipPath: string,
    issues: ValidationIssue[],
  ): void {
    if (!fs.existsSync(srcZipPath)) {
      return;
    }

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

  private verifyInstructionsChecksums(
    entry: Manifest['versions'][number],
    versionDir: string,
    issues: ValidationIssue[],
  ): void {
    const instructionsArtifact = entry.instructionsArtifact;
    const instructionsSha256 = entry.instructionsSha256;
    const hasInstructionsArtifact = instructionsArtifact !== undefined;
    const hasInstructionsSha256 = instructionsSha256 !== undefined;

    if (hasInstructionsArtifact !== hasInstructionsSha256) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `manifest.json version ${this.version}: instructionsArtifact and instructionsSha256 must both be present or both absent`,
        ),
      );
      return;
    }

    if (!hasInstructionsArtifact) {
      return;
    }

    if (instructionsArtifact !== INSTRUCTIONS_FILENAME) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `manifest.json version ${this.version}: instructionsArtifact must be "${INSTRUCTIONS_FILENAME}"`,
        ),
      );
    }

    const instructionsPath = path.join(versionDir, INSTRUCTIONS_FILENAME);
    if (!fs.existsSync(instructionsPath)) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `Missing chat-web manifest: ${INSTRUCTIONS_FILENAME}`,
        ),
      );
      return;
    }

    if (
      typeof instructionsSha256 !== 'string' ||
      !SHA256_PATTERN.test(instructionsSha256)
    ) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `manifest.json version ${this.version}: instructionsSha256 must be 64 lowercase hex characters`,
        ),
      );
      return;
    }

    const actualHash = Checksum.sha256(instructionsPath);
    if (actualHash !== instructionsSha256) {
      issues.push(
        err(
          'ERR_CHECKSUM_MISMATCH',
          `${INSTRUCTIONS_FILENAME} sha256 mismatch for version "${this.version}": ` +
            `manifest has "${instructionsSha256}", computed "${actualHash}"`,
        ),
      );
    }
  }

  private verifyManifestChecksums(
    entry: Manifest['versions'][number],
    versionDir: string,
    srcZipPath: string,
    issues: ValidationIssue[],
  ): void {
    if (!Array.isArray(entry.artifacts) || entry.artifacts.length === 0) {
      issues.push(
        err(
          'ERR_VALIDATION_FAILED',
          `manifest.json version ${this.version}: artifacts must be a non-empty array`,
        ),
      );
      return;
    }

    this.verifyTargetArtifacts(entry, versionDir, issues);
    this.verifySourceArchiveChecksum(entry, srcZipPath, issues);
    this.verifyInstructionsChecksums(entry, versionDir, issues);
  }

  private validateManifestAndChecksums(
    manifestPath: string,
    versionDir: string,
    srcZipPath: string,
    snapshotMetaPath: string,
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

    this.verifyManifestChecksums(entry, versionDir, srcZipPath, issues);

    if (fs.existsSync(snapshotMetaPath)) {
      try {
        const snapshotMeta = JSON.parse(fs.readFileSync(snapshotMetaPath, 'utf-8')) as PackageMetadata;
        validateCompatibilityManifestAlignment(snapshotMeta, manifest, issues, {
          version: this.version,
        });
      } catch {
        issues.push(err('ERR_VALIDATION_FAILED', `Snapshot ${METADATA_FILENAME} is not valid JSON`));
      }
    }
  }

  validate(): ValidationReport {
    const issues: ValidationIssue[] = [];
    const { versionDir, manifestPath, srcZipPath, snapshotMetaPath } = this.getPaths();

    if (!fs.existsSync(versionDir)) {
      return {
        packageId: this.qualifiedRef,
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

    this.validateRequiredSnapshotFiles(srcZipPath, snapshotMetaPath, issues);

    const manifestEntry = this.peekManifestVersionEntry(manifestPath);
    const allowInstructionsFile = manifestEntry?.instructionsArtifact === INSTRUCTIONS_FILENAME;
    this.validateVersionDirEntries(versionDir, issues, allowInstructionsFile);

    this.validateManifestAndChecksums(manifestPath, versionDir, srcZipPath, snapshotMetaPath, issues);

    if (fs.existsSync(srcZipPath)) {
      issues.push(...scanSnapshotZip(srcZipPath, { type: 'source', expectedVersion: this.version }));
    }

    const { errors, warnings } = splitIssues(issues);
    return { packageId: this.qualifiedRef, errors, warnings, passed: errors.length === 0 };
  }
}
