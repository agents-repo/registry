import { execSync } from 'child_process';

const PROTECTED_BRANCHES: Array<string | RegExp> = [
  'main',
  'master',
  /^release\/.+/,
];

export function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

export function isProtectedBranch(branch: string): boolean {
  return PROTECTED_BRANCHES.some((p) =>
    typeof p === 'string' ? p === branch : p.test(branch),
  );
}
