import semver from 'semver';

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
