import semver from 'semver';

export class ValidationUtils {
  private static readonly RFC3339_RE =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

  static compareCodeUnit(left: string, right: string): number {
    if (left < right) {
      return -1;
    }

    if (left > right) {
      return 1;
    }

    return 0;
  }

  static isHttpsUrl(value: string): boolean {
    try {
      const u = new URL(value);
      return u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  static isRfc3339(value: string): boolean {
    return ValidationUtils.RFC3339_RE.test(value);
  }

  static isReleaseVersion(v: string): boolean {
    const parsed = semver.parse(v);
    return parsed !== null && parsed.prerelease.length === 0 && parsed.build.length === 0;
  }
}
