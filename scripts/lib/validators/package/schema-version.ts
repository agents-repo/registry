import {
  describeSchemaVersionStatus,
  getSchemaCurrentVersion,
  type SchemaFamily,
} from '../../schema-versions';
import type { ValidationIssue } from '../../types';
import { err, warn } from '../common/issues';

export function validateSchemaVersion(
  issues: ValidationIssue[],
  opts: {
    family: SchemaFamily;
    value: unknown;
    context: string;
    errorCode: string;
  },
): void {
  const { family, value, context, errorCode } = opts;
  const result = describeSchemaVersionStatus(family, value);
  const expected = result.expected.join(', ');
  const current = getSchemaCurrentVersion(family);

  if (result.status === 'deprecated') {
    issues.push(
      warn(
        `${context}: schemaVersion ${JSON.stringify(value)} is deprecated for ${family}; current is ${JSON.stringify(current)}.`,
      ),
    );
    return;
  }

  if (result.status === 'eol') {
    issues.push(
      err(
        errorCode,
        `${context}: schemaVersion ${JSON.stringify(value)} is end-of-life for ${family}; supported versions are [${expected}].`,
      ),
    );
    return;
  }

  if (result.status === 'unsupported') {
    issues.push(
      err(
        errorCode,
        `${context}: unsupported schemaVersion ${JSON.stringify(value)} for ${family}; supported versions are [${expected}].`,
      ),
    );
  }
}
