import { describe, expect, it } from 'vitest';
import { ValidationUtils } from '../../../../scripts/lib/validation-utils';

describe('ValidationUtils.describeInvalidReleaseVersionInput', (): void => {
  it('returns a JSON-quoted string for string inputs', (): void => {
    expect(ValidationUtils.describeInvalidReleaseVersionInput('1.0.0-beta')).toBe('"1.0.0-beta"');
    expect(ValidationUtils.describeInvalidReleaseVersionInput('')).toBe('""');
    expect(ValidationUtils.describeInvalidReleaseVersionInput('bad\ninput')).toBe('"bad\\ninput"');
  });

  it("returns the string 'null' for null", (): void => {
    expect(ValidationUtils.describeInvalidReleaseVersionInput(null)).toBe('null');
  });

  it('summarizes non-string types without serializing full values', (): void => {
    expect(ValidationUtils.describeInvalidReleaseVersionInput(undefined)).toBe('<undefined>');
    expect(ValidationUtils.describeInvalidReleaseVersionInput(1)).toBe('<number>');
    expect(ValidationUtils.describeInvalidReleaseVersionInput({ version: '1.0.0' })).toBe('<object>');
    expect(ValidationUtils.describeInvalidReleaseVersionInput(['1.0.0'])).toBe('<object>');
  });
});
