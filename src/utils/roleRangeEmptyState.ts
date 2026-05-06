import { getRollingRange, getRollingRangeQueryBounds } from '@/utils/dateRanges';

export type RoleRangePeriod = '7d' | '30d';

export type RoleRangeEmptyState =
  | { kind: 'none' }
  | { kind: 'noLogsEver' }
  | {
      kind: 'noLogsInRange';
      rangeLabel: string;
      lastSessionAt: string;
      canSwitchToWiderRange: boolean;
    };

function getPreset(period: RoleRangePeriod): 'last7Days' | 'last30Days' {
  return period === '7d' ? 'last7Days' : 'last30Days';
}

function isWithinLast30Days(isoString: string, now: Date): boolean {
  const range = getRollingRange('last30Days', now);
  const bounds = getRollingRangeQueryBounds(range);
  const value = new Date(isoString).getTime();
  const start = new Date(bounds.startIso).getTime();
  const endExclusive = new Date(bounds.endExclusiveIso).getTime();
  return value >= start && value < endExclusive;
}

export function deriveRoleRangeEmptyState(params: {
  period: RoleRangePeriod;
  selectedRangeSessionCount: number;
  completedSessionCount: number;
  lastSessionAt: string | null;
  now?: Date;
}): RoleRangeEmptyState {
  const {
    period,
    selectedRangeSessionCount,
    completedSessionCount,
    lastSessionAt,
    now = new Date(),
  } = params;

  if (selectedRangeSessionCount > 0) return { kind: 'none' };
  if (completedSessionCount === 0 || !lastSessionAt) return { kind: 'noLogsEver' };

  return {
    kind: 'noLogsInRange',
    rangeLabel: getRollingRange(getPreset(period), now).label.toLowerCase(),
    lastSessionAt,
    canSwitchToWiderRange: period === '7d' && isWithinLast30Days(lastSessionAt, now),
  };
}
