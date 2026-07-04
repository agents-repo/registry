import fs from 'node:fs';
import path from 'node:path';
import { ErrorCode, PackageError } from './errors';
import {
  ID_PATTERN,
  INDEX_FILENAME,
  METADATA_FILENAME,
  MANIFEST_FILENAME,
  OWNERS_FILENAME,
  QUALIFIED_ID_PATTERN,
  TREE_FILENAME,
  VERSIONS_DIR,
} from './constants';
import type { ValidationIssue, ValidationReport } from './types';
import { err } from './validators/common/issues';

export const RESERVED_NAMESPACE_NAMES = new Set([INDEX_FILENAME, TREE_FILENAME]);

export interface PackageRef {
  namespace: string;
  packageId: string;
  qualifiedId: string;
}

export interface DiscoveredPackage {
  ref: PackageRef;
  packageDir: string;
  namespaceDir: string;
}

export function buildQualifiedId(namespace: string, packageId: string): string {
  return `${namespace}/${packageId}`;
}

export function parseQualifiedPackageRef(input: string): PackageRef {
  const trimmed = input.trim();
  if (!QUALIFIED_ID_PATTERN.test(trimmed)) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `Package ref must be qualified as namespace/package-id (e.g. agents-repo/hello-agent), got: ${JSON.stringify(input)}`,
    );
  }

  const slashIndex = trimmed.indexOf('/');
  const namespace = trimmed.slice(0, slashIndex);
  const packageId = trimmed.slice(slashIndex + 1);

  if (!ID_PATTERN.test(namespace) || !ID_PATTERN.test(packageId)) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `Namespace and package-id must be lowercase kebab-case, got: ${JSON.stringify(input)}`,
    );
  }

  if (RESERVED_NAMESPACE_NAMES.has(namespace)) {
    throw new PackageError(
      ErrorCode.ERR_VALIDATION_FAILED,
      `"${namespace}" is a reserved namespace name`,
    );
  }

  return { namespace, packageId, qualifiedId: trimmed };
}

export function resolvePackageDir(
  ref: PackageRef | string,
  packagesDir: string,
): { packageDir: string; ref: PackageRef; report?: ValidationReport } {
  const packageRef = typeof ref === 'string' ? parseQualifiedPackageRef(ref) : ref;
  const packageDir = path.join(packagesDir, packageRef.namespace, packageRef.packageId);

  if (!fs.existsSync(packageDir)) {
    return {
      packageDir,
      ref: packageRef,
      report: {
        packageId: packageRef.qualifiedId,
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

  return { packageDir, ref: packageRef };
}

export function validateNamespaceEqualsOwner(namespace: string, metadataOwner: string, qualifiedId: string): void {
  if (namespace !== metadataOwner) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `namespace "${namespace}" must equal metadata.json owner "${metadataOwner}" for package "${qualifiedId}"`,
    );
  }
}

export function assertNoOwnersJson(namespaceDir: string): void {
  const ownersPath = path.join(namespaceDir, OWNERS_FILENAME);
  if (fs.existsSync(ownersPath)) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      `Custom namespaces are not supported yet; remove ${ownersPath} (see NAMESPACE_RULES.md)`,
    );
  }
}

export function listDiscoveredPackages(packagesDir: string): DiscoveredPackage[] {
  if (!fs.existsSync(packagesDir)) {
    return [];
  }

  const discovered: DiscoveredPackage[] = [];

  for (const namespaceEntry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!namespaceEntry.isDirectory() || RESERVED_NAMESPACE_NAMES.has(namespaceEntry.name)) {
      continue;
    }

    const namespace = namespaceEntry.name;
    if (!ID_PATTERN.test(namespace)) {
      continue;
    }

    const namespaceDir = path.join(packagesDir, namespace);
    assertNoOwnersJson(namespaceDir);

    for (const packageEntry of fs.readdirSync(namespaceDir, { withFileTypes: true })) {
      if (!packageEntry.isDirectory() || !ID_PATTERN.test(packageEntry.name)) {
        continue;
      }

      const packageId = packageEntry.name;
      const packageDir = path.join(namespaceDir, packageId);
      const metadataPath = path.join(packageDir, METADATA_FILENAME);
      const manifestPath = path.join(packageDir, VERSIONS_DIR, MANIFEST_FILENAME);

      if (!fs.existsSync(metadataPath) || !fs.existsSync(manifestPath)) {
        continue;
      }

      discovered.push({
        ref: {
          namespace,
          packageId,
          qualifiedId: buildQualifiedId(namespace, packageId),
        },
        packageDir,
        namespaceDir,
      });
    }
  }

  return discovered.sort((a, b) => a.ref.qualifiedId.localeCompare(b.ref.qualifiedId));
}

export function buildPackagePath(namespace: string, packageId: string): string {
  return `packages/${namespace}/${packageId}`;
}

export function buildAliasesFromPackages(packages: Array<{ ref: PackageRef }>): Record<string, string> {
  const aliases: Record<string, string> = {};

  for (const { ref } of packages) {
    if (ref.packageId in aliases && aliases[ref.packageId] !== ref.qualifiedId) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `Cannot build aliases: duplicate leaf package id "${ref.packageId}" maps to both "${aliases[ref.packageId]}" and "${ref.qualifiedId}"`,
      );
    }
    aliases[ref.packageId] = ref.qualifiedId;
  }

  return aliases;
}

export function validateNamespaceSegment(namespace: string, issues: ValidationIssue[]): boolean {
  if (!ID_PATTERN.test(namespace)) {
    issues.push(err('ERR_METADATA_INVALID', `Invalid namespace "${namespace}": must be lowercase kebab-case`));
    return false;
  }
  if (RESERVED_NAMESPACE_NAMES.has(namespace)) {
    issues.push(err('ERR_METADATA_INVALID', `"${namespace}" is a reserved namespace name`));
    return false;
  }
  return true;
}
