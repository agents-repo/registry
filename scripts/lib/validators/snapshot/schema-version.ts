import { describeSchemaVersionStatus, getSchemaCurrentVersion, type SchemaFamily } from '../../schema-versions';
import type { ValidationIssue } from '../../types';
import { err, warn } from '../common/issues';

export function validateSchemaVersion(
  value: unknown,
  context: string,
  family: SchemaFamily = 'metadata.package',
  errorCode = 'ERR_METADATA_INVALID',
): ValidationIssue[] {
  const result = describeSchemaVersionStatus(family, value);
  const current = getSchemaCurrentVersion(family);
  const supported = result.expected.join(', ');

  if (result.status === 'deprecated') {
    return [
      warn(
        `${context}: schemaVersion ${JSON.stringify(value)} is deprecated for ${family}; current is ${JSON.stringify(current)}.`,
      ),
    ];
  }

  if (result.status === 'eol') {
    return [
      err(
        errorCode,
        `${context}: schemaVersion ${JSON.stringify(value)} is end-of-life for ${family}; supported versions are [${supported}].`,
      ),
    ];
  }

  if (result.status === 'unsupported') {
    return [
      err(
        errorCode,
        `${context}: unsupported schemaVersion ${JSON.stringify(value)} for ${family}; supported versions are [${supported}].`,
      ),
    ];
  }

  return [];
}
