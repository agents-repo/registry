import type { SchemaFamily } from '../../schema-versions';
import type { ValidationIssue } from '../../types';
import { getSchemaVersionIssues } from '../common/schema-version';

export function validateSchemaVersion(
  issues: ValidationIssue[],
  opts: {
    family: SchemaFamily;
    value: unknown;
    context: string;
    errorCode: string;
  },
): void {
  issues.push(...getSchemaVersionIssues(opts));
}
