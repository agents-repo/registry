import { simpleGit } from 'simple-git';

export class GitContext {
  private static readonly PROTECTED_BRANCHES: Array<string | RegExp> = [
    'main',
    'master',
    /^release\/.+/,
  ];

  async getBranch(): Promise<string> {
    try {
      const branch = await simpleGit().revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch {
      return '';
    }
  }

  isProtected(branch: string): boolean {
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
