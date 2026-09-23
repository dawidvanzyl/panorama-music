import { describe, it, expect } from 'vitest';
import { formatReportDate } from '../report-date-format';

describe('formatReportDate', { tags: ['317UC22'] }, () => {
  it('renders yyyy-MM-dd HH:mm (R6)', () => {
    const date = new Date(2026, 8, 22, 10, 15); // September (month index 8)

    expect(formatReportDate(date)).toBe('2026-09-22 10:15');
  });

  it('pads a single-digit month, day, hour and minute', () => {
    const date = new Date(2026, 2, 5, 9, 5); // March

    expect(formatReportDate(date)).toBe('2026-03-05 09:05');
  });

  it('never renders a locale month name, only digits', () => {
    for (let month = 0; month < 12; month++) {
      const formatted = formatReportDate(new Date(2026, month, 1, 0, 0));
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    }
  });
});
