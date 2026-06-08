import { PackageError, ErrorCode } from './errors';
import { INSTALL_TARGET_IDS } from './constants';
import type {
  CompatibilityTarget,
  InstallTargetIndexEntry,
  ManifestArtifactEntry,
  PackageCompatibility,
  PackageMetadata,
} from './types';
import { isInstallTargetId, isInstallTargetStatus } from './types';

const DEFAULT_CANONICAL_FORMAT = 'agents-repo.agent-instruction@1.0.0';

const DEFAULT_TARGETS: CompatibilityTarget[] = [
  { id: 'github-copilot', status: 'supported' },
  { id: 'cursor', status: 'supported' },
  { id: 'claude-code', status: 'supported' },
  { id: 'openai-codex', status: 'supported' },
];

function parseCompatibilityObject(value: unknown): PackageCompatibility {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      'metadata.json compatibility must be an object when provided',
    );
  }

  const compatibility = value as Record<string, unknown>;
  const canonicalFormatValue = compatibility['canonicalFormat'];
  const canonicalFormat =
    typeof canonicalFormatValue === 'string' && canonicalFormatValue.trim().length > 0
      ? canonicalFormatValue
      : DEFAULT_CANONICAL_FORMAT;

  const rawTargets = compatibility['targets'];
  if (!Array.isArray(rawTargets) || rawTargets.length === 0) {
    throw new PackageError(
      ErrorCode.ERR_METADATA_INVALID,
      'metadata.json compatibility.targets must be a non-empty array',
    );
  }

  const targets: CompatibilityTarget[] = [];
  const seen = new Set<string>();

  for (const entry of rawTargets) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        'metadata.json compatibility.targets entries must be objects',
      );
    }

    const record = entry as Record<string, unknown>;
    const id = record['id'];
    const status = record['status'];

    if (!isInstallTargetId(id)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `metadata.json compatibility.targets id must be one of: ${INSTALL_TARGET_IDS.join(', ')}`,
      );
    }

    if (!isInstallTargetStatus(status)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        'metadata.json compatibility.targets status must be supported, experimental, or planned',
      );
    }

    if (seen.has(id)) {
      throw new PackageError(
        ErrorCode.ERR_METADATA_INVALID,
        `metadata.json compatibility.targets contains duplicate id: ${id}`,
      );
    }

    seen.add(id);
    targets.push({ id, status });
  }

  return { canonicalFormat, targets };
}

export function parsePackageCompatibility(metadata: PackageMetadata): PackageCompatibility {
  if (metadata.compatibility === undefined) {
    return {
      canonicalFormat: DEFAULT_CANONICAL_FORMAT,
      targets: DEFAULT_TARGETS,
    };
  }

  return parseCompatibilityObject(metadata.compatibility);
}

export function resolveDeclaredInstallTargets(metadata: PackageMetadata): CompatibilityTarget[] {
  return parsePackageCompatibility(metadata).targets.filter((target) => target.status !== 'planned');
}

export function projectInstallTargetsForIndex(
  metadata: PackageMetadata,
  artifacts: ManifestArtifactEntry[],
): InstallTargetIndexEntry[] {
  const declared = resolveDeclaredInstallTargets(metadata);
  const builtTargets = new Set(artifacts.map((artifact) => artifact.target));

  const projected: InstallTargetIndexEntry[] = [];
  for (const target of declared) {
    if (!builtTargets.has(target.id)) {
      throw new PackageError(
        ErrorCode.ERR_VALIDATION_FAILED,
        `Install target "${target.id}" is declared in compatibility but missing from manifest artifacts`,
      );
    }

    if (target.status !== 'supported' && target.status !== 'experimental') {
      continue;
    }

    projected.push({ id: target.id, status: target.status });
  }

  return projected;
}
