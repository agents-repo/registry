import path from 'node:path';
import { fileURLToPath } from 'node:url';
import semver from 'semver';

export function parseRequiredPackageId(argv: string[]): string {
  const args = argv.slice(2);
  const idx = args.indexOf('--package');
  if (idx === -1 || !args[idx + 1]) {
    console.error('Error: --package <id> is required');
    process.exit(1);
  }
  return args[idx + 1];
}

export function parseOptionalFlagValue(argv: string[], flag: string): string | undefined {
  const args = argv.slice(2);
  const idx = args.indexOf(flag);
  if (idx === -1) {
    return undefined;
  }
  return args[idx + 1];
}

export function hasFlag(argv: string[], flag: string): boolean {
  return argv.slice(2).includes(flag);
}

export function resolveScriptPaths(importMetaUrl: string): {
  scriptDir: string;
  repoRoot: string;
  packagesDir: string;
} {
  const scriptDir = fileURLToPath(new URL('.', importMetaUrl));
  const repoRootOverride = process.env.REGISTRY_REPO_ROOT?.trim();
  const repoRoot = repoRootOverride === undefined || repoRootOverride.length === 0
    ? path.resolve(scriptDir, '..')
    : path.resolve(repoRootOverride);
  const packagesDir = path.join(repoRoot, 'packages');
  return { scriptDir, repoRoot, packagesDir };
}

export function parseReleaseVersion(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = semver.parse(value);
  if (!parsed || parsed.prerelease.length > 0 || parsed.build.length > 0) {
    return null;
  }

  return parsed.version;
}
