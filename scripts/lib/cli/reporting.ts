import type { ValidationReport } from '../types';

export function printValidationIssues(report: ValidationReport): void {
  for (const warning of report.warnings) {
    console.warn(`  [WARN]  ${warning.message}`);
  }

  for (const error of report.errors) {
    console.error(`  [ERROR] (${error.code}) ${error.message}`);
  }
}

export function exitWithValidationResult(
  report: ValidationReport,
  opts: { successMessage: string; failurePrefix: string },
): never {
  printValidationIssues(report);

  if (report.passed) {
    console.log(opts.successMessage);
    process.exit(0);
  }

  console.error(`${opts.failurePrefix} — ${report.errors.length} error(s)`);
  process.exit(1);
}
