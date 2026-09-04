import { describe, expect, it } from 'vitest';
import {
  costBandForEstimatedCost,
  isBandAlignedWithCost,
} from '../../../../scripts/lib/constants';

describe('costBandForEstimatedCost', (): void => {
  it('maps integers to the documented band ranges', (): void => {
    expect(costBandForEstimatedCost(1)).toBe('minimal');
    expect(costBandForEstimatedCost(2)).toBe('minimal');
    expect(costBandForEstimatedCost(3)).toBe('low');
    expect(costBandForEstimatedCost(4)).toBe('low');
    expect(costBandForEstimatedCost(5)).toBe('moderate');
    expect(costBandForEstimatedCost(6)).toBe('moderate');
    expect(costBandForEstimatedCost(7)).toBe('high');
    expect(costBandForEstimatedCost(8)).toBe('high');
    expect(costBandForEstimatedCost(9)).toBe('critical');
    expect(costBandForEstimatedCost(10)).toBe('critical');
  });

  it('throws when estimatedCost is out of range or not an integer', (): void => {
    expect(() => costBandForEstimatedCost(0)).toThrow(RangeError);
    expect(() => costBandForEstimatedCost(11)).toThrow(RangeError);
    expect(() => costBandForEstimatedCost(3.5)).toThrow(RangeError);
  });
});

describe('isBandAlignedWithCost', (): void => {
  it('returns true when band matches estimatedCost', (): void => {
    expect(isBandAlignedWithCost('low', 3)).toBe(true);
    expect(isBandAlignedWithCost('moderate', 6)).toBe(true);
  });

  it('returns false when band does not match estimatedCost', (): void => {
    expect(isBandAlignedWithCost('low', 2)).toBe(false);
    expect(isBandAlignedWithCost('minimal', 4)).toBe(false);
  });

  it('allows mixed when allowMixed is true', (): void => {
    expect(isBandAlignedWithCost('mixed', 1, true)).toBe(true);
    expect(isBandAlignedWithCost('mixed', 10, true)).toBe(true);
  });

  it('does not allow mixed when allowMixed is false', (): void => {
    expect(isBandAlignedWithCost('mixed', 5, false)).toBe(false);
  });
});
