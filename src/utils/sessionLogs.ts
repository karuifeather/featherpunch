import { formatLocalDayLabel, getLocalDayKey } from "@/utils/localDate";
import {
  getRollingRange,
  getRollingRangeQueryBounds,
} from "@/utils/dateRanges";
import { startOfLocalDay, startOfNextLocalDay } from "@/utils/localDate";
import type { SessionLogEntry } from "@/types";

export type SessionLogGroup = {
  dayKey: string;
  label: string;
  entries: SessionLogEntry[];
};

export type LogsEmptyState = {
  title: string;
  body: string;
};

export type LogsRangeFilter =
  | "last7Days"
  | "last30Days"
  | "last90Days"
  | "custom"
  | "all";

export type CustomDateRange = {
  startDate: string;
  endDate: string;
};

export function groupSessionLogsByLocalDay(
  entries: SessionLogEntry[],
): SessionLogGroup[] {
  const byDay = new Map<string, SessionLogEntry[]>();

  for (const entry of entries) {
    const dayKey = getLocalDayKey(entry.startAt);
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey)!.push(entry);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, dayEntries]) => ({
      dayKey,
      label: formatLocalDayLabel(dayEntries[0]?.startAt ?? dayKey),
      entries: [...dayEntries].sort(
        (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
      ),
    }));
}

export function deriveLogsEmptyState(options: {
  totalCompletedCount: number;
  filteredCount: number;
  selectedRange: LogsRangeFilter;
  selectedRangeLabel: string;
  customRangeLabel?: string;
  selectedRoleName?: string;
}): LogsEmptyState {
  const {
    totalCompletedCount,
    filteredCount,
    selectedRange,
    selectedRangeLabel,
    customRangeLabel,
    selectedRoleName,
  } = options;
  const isAllRange = selectedRange === "all";
  const isCustom = selectedRange === "custom";
  const normalizedRangeLabel = selectedRangeLabel.toLowerCase();
  const customPhrase = customRangeLabel
    ? `from ${customRangeLabel}`
    : "in custom range";

  if (totalCompletedCount === 0) {
    return isAllRange
      ? {
          title: "No completed logs yet",
          body: "Your completed shifts will appear here.",
        }
      : {
          title: "No completed logs yet",
          body: "Punch into a role and clock out to create your first log.",
        };
  }

  if (filteredCount > 0) {
    return {
      title: "",
      body: "",
    };
  }

  if (selectedRoleName) {
    return isAllRange
      ? {
          title: `No logs for ${selectedRoleName}`,
          body: "Try All or choose another role.",
        }
      : isCustom
        ? {
            title: `No logs for ${selectedRoleName} ${customPhrase}`,
            body: "Try a wider range, All, or choose another role.",
          }
        : {
            title: `No logs for ${selectedRoleName} in the ${normalizedRangeLabel}`,
            body: "Try Custom, All, or choose another role.",
          };
  }

  if (isAllRange) {
    return {
      title: "No completed logs yet",
      body: "Your completed shifts will appear here.",
    };
  }

  if (isCustom) {
    return {
      title: `No logs ${customPhrase}`,
      body: "Try a wider range or All.",
    };
  }

  return {
    title: `No logs in the ${normalizedRangeLabel}`,
    body: "Try Last 30 days, Custom, or All.",
  };
}

export function buildLogsQueryBounds(options: {
  selectedRange: LogsRangeFilter;
  customRange?: CustomDateRange | null;
}): {
  startIso?: string;
  endExclusiveIso?: string;
} {
  const { selectedRange, customRange } = options;
  if (selectedRange === "all") return {};

  if (selectedRange === "custom" && customRange) {
    const start = startOfLocalDay(customRange.startDate);
    const endExclusive = startOfNextLocalDay(customRange.endDate);
    return {
      startIso: start.toISOString(),
      endExclusiveIso: endExclusive.toISOString(),
    };
  }

  if (selectedRange === "custom") return {};
  const rolling = getRollingRange(selectedRange);
  return getRollingRangeQueryBounds(rolling);
}

export function buildSelectedRoleSummaryQueryOptions(options: {
  roleId: string;
  selectedRange: LogsRangeFilter;
  customRange?: CustomDateRange | null;
}): {
  roleId: string;
  startIso?: string;
  endExclusiveIso?: string;
} {
  const bounds = buildLogsQueryBounds({
    selectedRange: options.selectedRange,
    customRange: options.customRange,
  });
  return {
    roleId: options.roleId,
    startIso: bounds.startIso,
    endExclusiveIso: bounds.endExclusiveIso,
  };
}

function formatMonthDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function getCustomRangeDisplayLabel(
  customRange: CustomDateRange,
): string {
  return `${formatMonthDay(customRange.startDate)} - ${formatMonthDay(customRange.endDate)}`;
}

export function isValidCustomDateRange(customRange: CustomDateRange): boolean {
  return (
    new Date(customRange.endDate).getTime() >=
    new Date(customRange.startDate).getTime()
  );
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function clampDayToMonth(
  year: number,
  month: number,
  day: number,
): number {
  return Math.min(day, getDaysInMonth(year, month));
}

export function getLogsRangeSummaryText(options: {
  selectedRange: LogsRangeFilter;
  customRange?: CustomDateRange | null;
  listLimit: number;
}): string {
  const { selectedRange, customRange, listLimit } = options;
  if (selectedRange === "all") {
    return `Showing latest ${listLimit} completed logs`;
  }
  if (selectedRange === "custom" && customRange) {
    return `Custom · ${getCustomRangeDisplayLabel(customRange)}`;
  }
  if (selectedRange === "custom") return "Custom";

  const range = getRollingRange(selectedRange);
  return `${range.label} · ${range.displayRange}`;
}
