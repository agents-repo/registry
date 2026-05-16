import type { ValidationIssue } from '../../types';

export function err(code: string, message: string): ValidationIssue {
  return { code, severity: 'error', message };
}

export function warn(message: string): ValidationIssue {
  return { code: 'WARN', severity: 'warning', message };
}

export function splitIssues(issues: ValidationIssue[]): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
} {
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  return { errors, warnings };
}
