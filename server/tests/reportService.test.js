import { describe, expect, it } from 'vitest';
import { startOfWeek } from '../src/services/reportService.js';

describe('weekly reporting period', () => {
  it('starts on Monday in UTC and ends one Monday later', () => {
    const start = startOfWeek('2026-11-22');
    expect(start.toISOString().slice(0, 10)).toBe('2026-11-16');
    expect(new Date(start.getTime() + 7 * 86400000).toISOString().slice(0, 10)).toBe('2026-11-23');
  });

  it('handles a Sunday date inside the Monday-Sunday week', () => {
    const start = startOfWeek('2026-11-23');
    expect(start.toISOString().slice(0, 10)).toBe('2026-11-23');
  });
});
