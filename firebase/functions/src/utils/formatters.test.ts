import { describe, it, expect } from 'vitest';
import { roundCurrency, formatVariantLabel } from './formatters';

describe('formatters', () => {
  it('should accurately round currency to two decimal places', () => {
    expect(roundCurrency(175.004)).toBe(175.0);
    expect(roundCurrency(175.006)).toBe(175.01);
    expect(roundCurrency(3.5)).toBe(3.5);
  });

  it('should format variant labels correctly', () => {
    expect(formatVariantLabel('idli podi', 250, 'g')).toBe('idli podi 250g');
    expect(formatVariantLabel('tea powder', '1.5', 'kg')).toBe('tea powder 1.5kg');
  });
});
