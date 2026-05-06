export type RollingRangePreset = 'last7Days' | 'last30Days' | 'last90Days';

export type RollingRange = {
  preset: RollingRangePreset;
  days: number;
  label: string;
  shortLabel: string;
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
  displayRange: string;
};

const PRESET_DETAILS: Record<
  RollingRangePreset,
  { days: number; label: string; shortLabel: string }
> = {
  last7Days: { days: 7, label: 'Last 7 days', shortLabel: '7 days' },
  last30Days: { days: 30, label: 'Last 30 days', shortLabel: '30 days' },
  last90Days: { days: 90, label: 'Last 90 days', shortLabel: '90 days' },
};

function startOfLocalDay(input: Date): Date {
  return new Date(input.getFullYear(), input.getMonth(), input.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(input: Date): Date {
  return new Date(
    input.getFullYear(),
    input.getMonth(),
    input.getDate(),
    23,
    59,
    59,
    999
  );
}

function formatMonthDay(input: Date): string {
  return input.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatDisplayRange(start: Date, end: Date): string {
  return `${formatMonthDay(start)} - ${formatMonthDay(end)}`;
}

export function getRollingRange(
  preset: RollingRangePreset,
  now: Date = new Date()
): RollingRange {
  const details = PRESET_DETAILS[preset];
  const end = endOfLocalDay(now);
  const start = startOfLocalDay(now);
  start.setDate(start.getDate() - (details.days - 1));

  return {
    preset,
    days: details.days,
    label: details.label,
    shortLabel: details.shortLabel,
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    displayRange: formatDisplayRange(start, end),
  };
}

export function getRollingRangeQueryBounds(range: RollingRange): {
  startIso: string;
  endExclusiveIso: string;
} {
  const endExclusive = new Date(
    range.end.getFullYear(),
    range.end.getMonth(),
    range.end.getDate() + 1,
    0,
    0,
    0,
    0
  );
  return {
    startIso: range.startIso,
    endExclusiveIso: endExclusive.toISOString(),
  };
}
