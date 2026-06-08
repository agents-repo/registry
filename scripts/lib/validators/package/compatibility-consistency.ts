import { resolveDeclaredInstallTargets } from '../../compatibility';
import type { Manifest, PackageMetadata, ValidationIssue } from '../../types';
import { err } from '../common/issues';

export function validateCompatibilityManifestAlignment(
  metadata: PackageMetadata,
  manifest: Manifest,
  issues: ValidationIssue[],
  options?: { version?: string },
): void {
  const declaredTargets = resolveDeclaredInstallTargets(metadata);
  const declaredIds = new Set(declaredTargets.map((target) => target.id));

  const entries =
    options?.version === undefined
      ? manifest.versions
      : manifest.versions.filter((entry) => entry.version === options.version);

  for (const entry of entries) {
    if (!Array.isArray(entry.artifacts)) {
      continue;
    }

    const manifestTargetIds = new Set(entry.artifacts.map((artifact) => artifact.target));

    for (const target of declaredTargets) {
      if (!manifestTargetIds.has(target.id)) {
        issues.push(
          err(
            'ERR_VALIDATION_FAILED',
            `manifest.json version ${entry.version}: missing artifact for declared install target "${target.id}"`,
          ),
        );
      }
    }

    for (const artifact of entry.artifacts) {
      if (!declaredIds.has(artifact.target)) {
        issues.push(
          err(
            'ERR_VALIDATION_FAILED',
            `manifest.json version ${entry.version}: artifact target "${artifact.target}" is not declared in metadata.json compatibility`,
          ),
        );
      }
    }
  }
}
