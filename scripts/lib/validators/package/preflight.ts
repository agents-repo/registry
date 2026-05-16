import fs from 'node:fs';
import path from 'node:path';
import type { ValidationIssue, ValidationReport } from '../../types';
import { err } from '../common/issues';
import { readJsonFile } from './json-reader';

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
): unknown | null {
  const metadataPath = path.join(packageDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    issues.push(err('ERR_METADATA_INVALID', 'metadata.json is missing from package root'));
    return null;
  }

  const { data, error } = readJsonFile(metadataPath);
  if (error) {
    issues.push(err('ERR_METADATA_INVALID', error));
    return null;
  }

  return data;
}
