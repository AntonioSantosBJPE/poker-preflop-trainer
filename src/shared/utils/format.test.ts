import { describe, expect, it } from 'vitest';
import { formatDuration } from './format';

describe('formatDuration', () => {
  it('returns "0s" for 0 ms', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('returns seconds-only for values under 60s', () => {
    expect(formatDuration(30000)).toBe('30s');
    expect(formatDuration(1000)).toBe('1s');
    expect(formatDuration(59999)).toBe('59s');
  });

  it('returns minutes and seconds for 60s or more', () => {
    expect(formatDuration(60000)).toBe('1min 0s');
    expect(formatDuration(125000)).toBe('2min 5s');
  });

  it('handles large values', () => {
    expect(formatDuration(3600000)).toBe('60min 0s');
    expect(formatDuration(3661000)).toBe('61min 1s');
  });

  it('rounds down fractional seconds', () => {
    expect(formatDuration(30)).toBe('0s');
    expect(formatDuration(999)).toBe('0s');
  });
});
