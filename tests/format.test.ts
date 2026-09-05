import { describe, expect, it } from 'vitest';
import {
  formatCasualties,
  formatCompactRange,
  formatSpan,
  formatYear,
  formatYearRange,
} from '@/lib/format';

describe('formatYear', () => {
  it('renders BCE, year 0 and early CE explicitly', () => {
    expect(formatYear(-3100)).toBe('3100 BCE');
    expect(formatYear(0)).toBe('1 BCE');
    expect(formatYear(476)).toBe('476 CE');
    expect(formatYear(1544)).toBe('1544');
  });
});

describe('formatSpan', () => {
  it('collapses a single-year entry to just the year (never "0 years")', () => {
    expect(formatSpan(1544, 1544)).toBe('1544');
    expect(formatYearRange(1544, 1544)).toBe('1544');
  });

  it('marks an ongoing conflict (endYear null) as present · ongoing', () => {
    expect(formatSpan(1991, null)).toBe('1991 – present · ongoing');
    expect(formatSpan(2014, undefined)).toBe('2014 – present · ongoing');
  });

  it('appends a duration for multi-year spans', () => {
    expect(formatSpan(1939, 1945)).toBe('1939 – 1945 · 6 years');
    expect(formatSpan(1914, 1915)).toBe('1914 – 1915 · 1 year');
  });
});

describe('formatCompactRange', () => {
  it('keeps the sign on BCE ranges', () => {
    expect(formatCompactRange(-336, -323)).toBe('336–323 BCE');
    expect(formatCompactRange(-31, 14)).toBe('31 BCE–14 CE');
  });

  it('abbreviates same-century modern ranges', () => {
    expect(formatCompactRange(1939, 1945)).toBe('1939–45');
    expect(formatCompactRange(1990, 2005)).toBe('1990–2005');
  });

  it('handles single-year and ongoing entries', () => {
    expect(formatCompactRange(1544, 1544)).toBe('1544');
    expect(formatCompactRange(1991, null)).toBe('1991–present');
    expect(formatCompactRange(476, 493)).toBe('476–493 CE');
  });
});

describe('formatCasualties', () => {
  it('uses one compact style everywhere', () => {
    expect(formatCasualties(null)).toBe('—');
    expect(formatCasualties(undefined)).toBe('—');
    expect(formatCasualties(950)).toBe('950');
    expect(formatCasualties(4200)).toBe('4.2K');
    expect(formatCasualties(85_000)).toBe('85K');
    expect(formatCasualties(1_200_000)).toBe('1.2M');
    expect(formatCasualties(60_000_000)).toBe('60M');
    expect(formatCasualties(1_500_000_000)).toBe('1.5B');
  });
});
