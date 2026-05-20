import { simpleGit } from 'simple-git';
import { PROTECTED_BRANCH_NAMES, PROTECTED_BRANCH_PATTERN } from './constants';

export class GitContext {
  private static readonly PROTECTED_BRANCHES: Array<string | RegExp> = [
    ...PROTECTED_BRANCH_NAMES,
    PROTECTED_BRANCH_PATTERN,
  ];

  /**
   * Attempts to detect the branch from GitHub Actions environment variables.
   * Handles detached HEAD state in CI environments.
   *
   * Returns null if detection fails or env vars are not available.
   */
  private getBranchFromEnv(): string | null {
    // GITHUB_REF_NAME: Current branch or tag name (e.g., "main", "v1.0.0")
    // For PRs, this is the source branch name (the branch being merged FROM)
    const refName = process.env.GITHUB_REF_NAME;

    // GITHUB_BASE_REF: Base branch name for PRs only (e.g., "main")
    // Exists only in pull_request events
    const baseRef = process.env.GITHUB_BASE_REF;

    // If in a PR, return the base branch (what would be committed to)
    // This is the more restrictive check for protected branches
    if (baseRef) {
      return baseRef;
    }

    // Otherwise, return current ref if available
    if (refName) {
      // Strip ref prefix if it's a full ref (e.g., "refs/tags/v1.0.0" -> "v1.0.0")
      // In most cases GITHUB_REF_NAME is already the short name, but be defensive
      return refName.replace(/^refs\/(heads|tags)\//, '');
    }

    return null;
  }

  /**
   * Gets the current branch with intelligent fallback for CI environments.
   *
   * Detection strategy (in order):
   * 1. Try `git rev-parse --abbrev-ref HEAD`
   * 2. If result is "HEAD" or empty (detached HEAD in CI), fall back to GitHub Actions env vars
   * 3. If env vars unavailable, return "HEAD" (fail-safe: will be treated as protected)
   */
  async getBranch(): Promise<string> {
    try {
      const gitBranch = await simpleGit().revparse(['--abbrev-ref', 'HEAD']);
      const trimmedBranch = gitBranch.trim();

      // If git detected a real branch name, use it
      if (trimmedBranch && trimmedBranch !== 'HEAD') {
        return trimmedBranch;
      }

      // Git returned "HEAD" or empty (detached HEAD state); try env vars
      const envBranch = this.getBranchFromEnv();
      if (envBranch) {
        return envBranch;
      }

      // No detection succeeded; return "HEAD" (fail-safe: protected by default)
      return 'HEAD';
    } catch {
      // If git call throws, try env vars as fallback
      const envBranch = this.getBranchFromEnv();
      if (envBranch) {
        return envBranch;
      }

      // Fail-safe: return "HEAD" (will be treated as protected)
      return 'HEAD';
    }
  }

  /**
   * Gets the current branch and its detection source.
   * Useful for debugging and error messages.
   */
  async getBranchWithSource(): Promise<{ branch: string; source: 'git' | 'env' | 'fallback' }> {
    try {
      const gitBranch = await simpleGit().revparse(['--abbrev-ref', 'HEAD']);
      const trimmedBranch = gitBranch.trim();

      // If git detected a real branch name, use it
      if (trimmedBranch && trimmedBranch !== 'HEAD') {
        return { branch: trimmedBranch, source: 'git' };
      }

      // Git returned "HEAD" or empty (detached HEAD state); try env vars
      const envBranch = this.getBranchFromEnv();
      if (envBranch) {
        return { branch: envBranch, source: 'env' };
      }

      // No detection succeeded; return "HEAD" (fail-safe: protected by default)
      return { branch: 'HEAD', source: 'fallback' };
    } catch {
      // If git call throws, try env vars as fallback
      const envBranch = this.getBranchFromEnv();
      if (envBranch) {
        return { branch: envBranch, source: 'env' };
      }

      // Fail-safe: return "HEAD" (will be treated as protected)
      return { branch: 'HEAD', source: 'fallback' };
    }
  }
  /**
   * Checks if a branch is protected.
   * Treats "HEAD" and empty string as protected (fail-safe for detached HEAD in CI).
   */
  isProtected(branch: string): boolean {
    // Fail-safe: treat empty string and "HEAD" as protected
    if (!branch || branch === 'HEAD') {
      return true;
    }

    return GitContext.PROTECTED_BRANCHES.some((p) =>
      typeof p === 'string' ? p === branch : p.test(branch),
    );
  }
}

// Backwards-compatible exports
export async function getCurrentBranch(): Promise<string> {
  return new GitContext().getBranch();
}

export function isProtectedBranch(branch: string): boolean {
  return new GitContext().isProtected(branch);
}
