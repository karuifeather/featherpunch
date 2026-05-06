import { formatDate, formatDurationShort } from "@/utils/formatTime";
import { getRollingRange } from "@/utils/dateRanges";

export type RoleDetailPeriod = "7d" | "30d";
export type RoleChartState = {
  hasSelectedRangeSessions: boolean;
  shouldShowChart: boolean;
  hasEnoughDataForTrend: boolean;
  trendMessage?: string;
};

export function deriveRoleHeaderSubtext(params: {
  roleName: string;
  period: RoleDetailPeriod;
  selectedRangeTotalMs: number;
  completedSessionCount: number;
  lastSessionAt: string | null;
}): string {
  const {
    period,
    selectedRangeTotalMs,
    completedSessionCount,
    lastSessionAt,
    roleName,
  } = params;
  if (selectedRangeTotalMs > 0) {
    const rangeLabel =
      period === "7d"
        ? getRollingRange("last7Days").label
        : getRollingRange("last30Days").label;
    return `${formatDurationShort(selectedRangeTotalMs)} in ${rangeLabel.toLowerCase()}`;
  }

  if (completedSessionCount > 0 && lastSessionAt) {
    return `Last tracked ${formatDate(lastSessionAt)}`;
  }

  if (roleName.trim().length === 0) return "No logs yet";
  return "No logs yet";
}

export function getTrendUnavailableCopy(activeDaysInRange: number): {
  title: string;
  body: string;
} {
  const dayLabel = `${activeDaysInRange} active ${activeDaysInRange === 1 ? "day" : "days"} so far`;
  return {
    title: "Activity this period",
    body: `${dayLabel}. Track this role across a few more days to unlock trends.`,
  };
}

export function hasEnoughDataForTrend(activeDaysInRange: number): boolean {
  return activeDaysInRange >= 2;
}

export function deriveRoleChartState(params: {
  selectedRangeSessionCount: number;
  activeDaysInRange: number;
}): RoleChartState {
  const hasSelectedRangeSessions = params.selectedRangeSessionCount > 0;
  const hasEnough = hasEnoughDataForTrend(params.activeDaysInRange);

  if (!hasSelectedRangeSessions) {
    return {
      hasSelectedRangeSessions: false,
      shouldShowChart: false,
      hasEnoughDataForTrend: false,
    };
  }

  return {
    hasSelectedRangeSessions: true,
    shouldShowChart: true,
    hasEnoughDataForTrend: hasEnough,
    trendMessage: hasEnough ? undefined : "Not enough data for a trend yet",
  };
}

export function buildOverviewRows(params: {
  period: RoleDetailPeriod;
  totalMs: number;
  sessionCount: number;
  avgSessionMs: number | null;
  longestSessionMs: number;
  activeDaysInPeriod: number;
  mostRecentDayActive: string | null;
  lifetimeDurationMs: number;
  includeEstimatedEarning?: string | null;
  last7Ms: number;
  last30Ms: number;
}): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Total time", value: formatDurationShort(params.totalMs) },
  ];

  if (params.includeEstimatedEarning) {
    rows.push({ label: "Est. earning", value: params.includeEstimatedEarning });
  }

  rows.push({ label: "Punch-ins", value: String(params.sessionCount) });

  if (params.avgSessionMs != null && params.sessionCount >= 2) {
    rows.push({
      label: "Average time in role",
      value: formatDurationShort(params.avgSessionMs),
    });
  }

  if (params.longestSessionMs > 0) {
    rows.push({
      label: "Longest session",
      value: formatDurationShort(params.longestSessionMs),
    });
  }

  rows.push({
    label: "Active days",
    value: `${params.activeDaysInPeriod} ${params.activeDaysInPeriod === 1 ? "day" : "days"}`,
  });

  if (params.mostRecentDayActive) {
    rows.push({
      label: "Most recent day active",
      value: params.mostRecentDayActive,
    });
  }

  rows.push({
    label: "Lifetime total",
    value: formatDurationShort(params.lifetimeDurationMs),
  });

  if (params.period === "7d") {
    rows.push({
      label: getRollingRange("last30Days").label,
      value: formatDurationShort(params.last30Ms),
    });
  } else {
    rows.push({
      label: getRollingRange("last7Days").label,
      value: formatDurationShort(params.last7Ms),
    });
  }

  return rows;
}
