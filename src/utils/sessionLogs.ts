import { formatLocalDayLabel, getLocalDayKey } from "@/utils/localDate";
import {
  getRollingRange,
  getRollingRangeQueryBounds,
} from "@/utils/dateRanges";
import { startOfLocalDay, startOfNextLocalDay } from "@/utils/localDate";
import type { SessionLogEntry } from "@/types";
import type { CompletedSessionLogSummary } from "@/types";
import { formatDurationShort } from "@/utils/formatTime";

export type SessionLogGroup = {
  dayKey: string;
  label: string;
  entries: SessionLogEntry[];
  totalDurationMs: number;
  sessionCount: number;
};

export type LogsEmptyState = {
  title: string;
  body: string;
  showClearFiltersAction?: boolean;
};

export type LogsSummary = {
  totalDurationMs: number;
  sessionCount: number;
  averageDurationMs: number;
  estimatedEarnings: number | null;
};

export type LogsRangeFilter =
  | "last7Days"
  | "last30Days"
  | "last90Days"
  | "custom"
  | "all";
type RollingLogsRangeFilter = Exclude<LogsRangeFilter, "custom" | "all">;

export type CustomDateRange = {
  startDate: string;
  endDate: string;
};

function isRollingLogsRangeFilter(
  range: LogsRangeFilter,
): range is RollingLogsRangeFilter {
  return (
    range === "last7Days" || range === "last30Days" || range === "last90Days"
  );
}

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
      totalDurationMs: dayEntries.reduce(
        (sum, entry) => sum + entry.durationMs,
        0,
      ),
      sessionCount: dayEntries.length,
    }));
}

export function summarizeVisibleLogs(entries: SessionLogEntry[]): LogsSummary {
  const totalDurationMs = entries.reduce(
    (sum, entry) => sum + entry.durationMs,
    0,
  );
  const sessionCount = entries.length;
  const averageDurationMs =
    sessionCount === 0 ? 0 : Math.round(totalDurationMs / sessionCount);
  const canEstimateAll =
    sessionCount > 0 && entries.every((entry) => entry.roleHourlyRate != null);
  const estimatedEarnings = canEstimateAll
    ? entries.reduce(
        (sum, entry) =>
          sum + (entry.durationMs / 3_600_000) * Number(entry.roleHourlyRate),
        0,
      )
    : null;

  return {
    totalDurationMs,
    sessionCount,
    averageDurationMs,
    estimatedEarnings,
  };
}

export function shouldShowRoleNameInLogRows(selectedRoleId: string): boolean {
  return selectedRoleId === "all";
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
    selectedRoleName,
  } = options;
  const isAllRange = selectedRange === "all";
  const isCustom = selectedRange === "custom";
  if (totalCompletedCount === 0) {
    return {
      title: "No completed shifts yet",
      body: "Clock in and punch out to create your first log.",
      showClearFiltersAction: !isAllRange || selectedRoleName != null,
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
          body: "Try All roles or choose a different range.",
          showClearFiltersAction: true,
        }
      : isCustom
        ? {
            title: `No logs for ${selectedRoleName}`,
            body: "Try All roles or choose a different range.",
            showClearFiltersAction: true,
          }
        : {
            title: `No logs for ${selectedRoleName}`,
            body: "Try All roles or choose a different range.",
            showClearFiltersAction: true,
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
      title: "No logs for this range",
      body: "Try a wider range or choose another role.",
      showClearFiltersAction: true,
    };
  }

  return {
    title: "No logs for this range",
    body: "Try a wider range or choose another role.",
    showClearFiltersAction: true,
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

export function buildCompletedLogsQueryOptions(options: {
  selectedRange: LogsRangeFilter;
  customRange?: CustomDateRange | null;
  roleId?: string;
}): {
  roleId?: string;
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

  if (!isRollingLogsRangeFilter(selectedRange)) return "Custom";
  const range = getRollingRange(selectedRange);
  return `${range.label} · ${range.displayRange}`;
}

export function formatSelectedRangeLabel(options: {
  selectedRange: LogsRangeFilter;
  customRange?: CustomDateRange | null;
}): string {
  if (options.selectedRange === "custom" && options.customRange) {
    return `Custom (${getCustomRangeDisplayLabel(options.customRange)})`;
  }
  if (options.selectedRange === "all") return "All";
  if (!isRollingLogsRangeFilter(options.selectedRange)) return "Custom";
  return getRollingRange(options.selectedRange).label;
}

export function buildLogsExportSummaryLines(options: {
  count: number;
  rangeSummary: string;
  selectedRoleName?: string;
  selectedRoleSummary?: CompletedSessionLogSummary | null;
}): string[] {
  const lines = [`Exporting ${options.count} completed logs`];
  if (!options.selectedRoleName) {
    lines.push(options.rangeSummary);
    lines.push("All roles");
    return lines;
  }

  lines.push(`${options.selectedRoleName} · ${options.rangeSummary}`);
  if (options.selectedRoleSummary) {
    lines.push(
      `Total: ${formatDurationShort(options.selectedRoleSummary.totalDurationMs)}`,
    );
    if (options.selectedRoleSummary.estimatedEarnings != null) {
      lines.push(
        `Estimated earnings: $${options.selectedRoleSummary.estimatedEarnings.toFixed(2)}`,
      );
    }
  }
  return lines;
}
