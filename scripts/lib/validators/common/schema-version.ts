import {
  describeSchemaVersionStatus,
  getSchemaCurrentVersion,
  type SchemaFamily,
} from '../../schema-versions';
import type { ValidationIssue } from '../../types';
import { err, warn } from './issues';

export interface SchemaVersionValidationInput {
  family: SchemaFamily;
  value: unknown;
  context: string;
  errorCode: string;
}

export function getSchemaVersionIssues(
  input: SchemaVersionValidationInput,
): ValidationIssue[] {
  const { family, value, context, errorCode } = input;
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
