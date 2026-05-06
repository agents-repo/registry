import { simpleGit } from 'simple-git';

const git = simpleGit();

const PROTECTED_BRANCHES: Array<string | RegExp> = [
  'main',
  'master',
  /^release\/.+/,
];

export async function getCurrentBranch(): Promise<string> {
  try {
    const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
    return branch.trim();
  } catch {
    return '';
  }
}

export function isProtectedBranch(branch: string): boolean {
  return PROTECTED_BRANCHES.some((p) =>
    typeof p === 'string' ? p === branch : p.test(branch),
  );
}
