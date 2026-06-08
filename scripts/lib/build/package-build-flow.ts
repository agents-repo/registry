import fs from 'node:fs';
import path from 'node:path';
import { printValidationIssues } from '../cli/reporting';
import { INDEX_FILENAME, MANIFEST_FILENAME, SOURCE_ARCHIVE_SUFFIX, VERSIONS_DIR } from '../constants';
import { ErrorCode, PackageError } from '../errors';
import { GitContext } from '../git';
import { Package } from '../package';
import { rollbackVersionDirectory, warnIfIndexMayBeInconsistent } from './rollback';
import { updateManifestAndIndexWithRollback } from './registry-sync';
import { prepareVersionSnapshot } from './snapshot-writer';
import { Checksum } from '../checksum';
import { PackageValidator } from '../validate-package';
import { ValidationUtils } from '../validation-utils';
import { ZipBuilder } from '../zip-builder';
import { buildTargetArtifacts, type BuiltTargetArtifact } from '../emitters/target-zip-builder';

export interface BuildPackageResult {
  packageId: string;
  version: string;
  versionDir: string;
  artifacts: BuiltTargetArtifact[];
  srcZipPath: string;
  manifestPath: string;
  indexPath: string;
}

export interface BuildPackageOptions {
  packageId: string;
  repoRoot: string;
  packagesDir?: string;
  forceRebuild?: boolean;
  log?: (message: string) => void;
}

function logMessage(log: ((message: string) => void) | undefined, message: string): void {
  if (log === undefined) {
    console.log(message);
    return;
  }

  log(message);
}

export async function buildPackageSnapshot(options: BuildPackageOptions): Promise<BuildPackageResult> {
  const {
    packageId,
    repoRoot,
    packagesDir = path.join(repoRoot, 'packages'),
    forceRebuild = false,
    log,
  } = options;

  const pkg = new Package(packageId, packagesDir);

  logMessage(log, '[1/7] Running preflight validation');
  const report = new PackageValidator(packageId, packagesDir).validate();
  printValidationIssues(report);
  if (!report.passed) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `Preflight validation failed for package: ${packageId} — ${report.errors.length} error(s)`,
    );
  }
  logMessage(log, '[1/7] Preflight passed');

  const metadata = pkg.loadMetadata();
  const postLoadReport = new PackageValidator(packageId, packagesDir).validate();
  printValidationIssues(postLoadReport);
  if (!postLoadReport.passed) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `Package changed after preflight validation for package: ${packageId} — ${postLoadReport.errors.length} error(s)`,
    );
  }

  const version = metadata.version;
  if (!ValidationUtils.isReleaseVersion(version)) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `metadata.json version must be a MAJOR.MINOR.PATCH release version, got: ${JSON.stringify(version)}`,
    );
  }
  logMessage(log, `[2/7] Target version: ${version}`);

  const versionDir = pkg.versionDir(version);
  const versionExists = fs.existsSync(versionDir);
  const git = new GitContext();

  if (versionExists) {
    const { branch, source } = await git.getBranchWithSource();
    if (forceRebuild) {
      if (git.isProtected(branch)) {
        throw new PackageError(
          ErrorCode.ERR_OVERWRITE_PROTECTED_BRANCH,
          `Cannot overwrite version "${version}" on protected branch "${branch}". ` +
            `--force-rebuild is not allowed on protected branches (main, master, release/*).`,
        );
      }
      logMessage(
        log,
        `[3/7] --force-rebuild on branch "${branch}" (detected from ${source}): overwriting existing version "${version}"`,
      );
      fs.rmSync(versionDir, { recursive: true, force: true });
    } else {
      throw new PackageError(
        ErrorCode.ERR_VERSION_EXISTS,
        `Version "${version}" already exists at ${versionDir}. ` +
          `Use --force-rebuild on a non-protected branch to overwrite.`,
      );
    }
  } else {
    logMessage(log, '[3/7] Overwrite check passed (new version)');
  }

  logMessage(log, `[4/7] Building version snapshot for ${version}`);
  const { srcZipPath } = prepareVersionSnapshot(pkg, versionDir, version);
  const indexPath = path.join(packagesDir, INDEX_FILENAME);
  let artifacts: BuiltTargetArtifact[];

  try {
    logMessage(log, '[5/7] Building install-target deployment ZIPs');
    artifacts = buildTargetArtifacts(pkg.packageDir, versionDir, version, metadata);
    for (const artifact of artifacts) {
      logMessage(log, `       ${artifact.file} sha256: ${artifact.sha256}`);
    }

    logMessage(log, `[6/7] Building source archive: ${version}${SOURCE_ARCHIVE_SUFFIX}`);
    const zipBuilder = new ZipBuilder(pkg.packageDir, version);
    zipBuilder.buildSourceZip(srcZipPath);

    const srcZipSha256 = Checksum.sha256(srcZipPath);
    logMessage(log, `       src sha256: ${srcZipSha256}`);

    logMessage(log, `[7/7] Updating ${VERSIONS_DIR}/${MANIFEST_FILENAME} and packages/${INDEX_FILENAME}`);
    updateManifestAndIndexWithRollback({
      packageId,
      manifestPath: pkg.manifestPath,
      indexPath,
      metadata,
      version,
      artifacts,
      srcZipSha256,
    });
  } catch (error) {
    rollbackVersionDirectory(versionDir);
    warnIfIndexMayBeInconsistent(indexPath, packageId);
    throw error;
  }

  return {
    packageId,
    version,
    versionDir,
    artifacts,
    srcZipPath,
    manifestPath: pkg.manifestPath,
    indexPath,
  };
}
