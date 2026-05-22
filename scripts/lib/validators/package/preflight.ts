import fs from 'node:fs';
import path from 'node:path';
import type { ValidationIssue, ValidationReport } from '../../types';
import { err } from '../common/issues';
import { readJsonFile } from './json-reader';
import { MANIFEST_FILENAME, METADATA_FILENAME, VERSIONS_DIR } from '../../constants';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function resolvePackageDir(
  packageId: string,
  packagesDir: string,
): { packageDir: string; report?: ValidationReport } {
  const packageDir = path.join(packagesDir, packageId);

  if (!fs.existsSync(packageDir)) {
    return {
      packageDir,
      report: {
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
      },
    };
  }

  return { packageDir };
}

export function loadPackageMetadata(
  packageDir: string,
  issues: ValidationIssue[],
): Record<string, unknown> | null {
  const metadataPath = path.join(packageDir, METADATA_FILENAME);
  if (!fs.existsSync(metadataPath)) {
    issues.push(err('ERR_METADATA_INVALID', `${METADATA_FILENAME} is missing from package root`));
    return null;
  }

  const { data, error } = readJsonFile(metadataPath);
  if (error) {
    issues.push(err('ERR_METADATA_INVALID', error));
    return null;
  }

  if (!isRecord(data)) {
    issues.push(err('ERR_METADATA_INVALID', `${METADATA_FILENAME} must be a JSON object`));
    return null;
  }

  return data;
}

export function getManifestPath(packageDir: string): string {
  return path.join(packageDir, VERSIONS_DIR, MANIFEST_FILENAME);
}

export function hasManifest(packageDir: string): boolean {
  return fs.existsSync(getManifestPath(packageDir));
}
