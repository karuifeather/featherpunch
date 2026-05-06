import { formatDate } from '@/utils/formatTime';
import { deriveRoleRangeEmptyState } from '@/utils/roleRangeEmptyState';

describe('deriveRoleRangeEmptyState', () => {
  const fixedNow = new Date(2026, 4, 6, 13, 45, 10, 125);

  it('returns none when selected range has sessions', () => {
    const result = deriveRoleRangeEmptyState({
      period: '7d',
      selectedRangeSessionCount: 2,
      completedSessionCount: 8,
      lastSessionAt: '2026-05-05T16:00:00.000Z',
      now: fixedNow,
    });

    expect(result).toEqual({ kind: 'none' });
  });

  it('returns noLogsEver when role has no completed history', () => {
    const result = deriveRoleRangeEmptyState({
      period: '7d',
      selectedRangeSessionCount: 0,
      completedSessionCount: 0,
      lastSessionAt: null,
      now: fixedNow,
    });

    expect(result).toEqual({ kind: 'noLogsEver' });
  });

  it('returns noLogsInRange with wider-range CTA for last7 when last session is in last30', () => {
    const result = deriveRoleRangeEmptyState({
      period: '7d',
      selectedRangeSessionCount: 0,
      completedSessionCount: 4,
      lastSessionAt: '2026-04-23T12:30:00.000Z',
      now: fixedNow,
    });

    expect(result).toEqual({
      kind: 'noLogsInRange',
      rangeLabel: 'last 7 days',
      lastSessionAt: '2026-04-23T12:30:00.000Z',
      canSwitchToWiderRange: true,
    });
  });

  it('returns noLogsInRange without CTA for last30 when history is older', () => {
    const result = deriveRoleRangeEmptyState({
      period: '30d',
      selectedRangeSessionCount: 0,
      completedSessionCount: 4,
      lastSessionAt: '2026-03-12T09:00:00.000Z',
      now: fixedNow,
    });

    expect(result).toEqual({
      kind: 'noLogsInRange',
      rangeLabel: 'last 30 days',
      lastSessionAt: '2026-03-12T09:00:00.000Z',
      canSwitchToWiderRange: false,
    });
  });
});

describe('formatDate', () => {
  it('formats date into human-readable compact style', () => {
    const formatted = formatDate('2026-04-23T12:30:00.000Z');
    expect(formatted).toMatch(/Apr/);
    expect(formatted).toMatch(/23/);
  });
});
