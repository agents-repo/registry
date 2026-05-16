import type { SchemaFamily } from '../../schema-versions';
import type { ValidationIssue } from '../../types';
import { getSchemaVersionIssues } from '../common/schema-version';

export function validateSchemaVersion(
  value: unknown,
  context: string,
  family: SchemaFamily = 'metadata.package',
  errorCode = 'ERR_METADATA_INVALID',
): ValidationIssue[] {
  return getSchemaVersionIssues({
    family,
    value,
    context,
    errorCode,
  });
}
