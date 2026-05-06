import { getRollingRange } from "@/utils/dateRanges";

export type RoleRangePeriod = "7d" | "30d";

export type RoleRangeEmptyState =
  | { kind: "none" }
  | { kind: "noLogsEver" }
  | {
      kind: "noLogsInRange";
      rangeLabel: string;
      lastSessionAt: string;
      hasOlderHistory: true;
    };

function getPreset(period: RoleRangePeriod): "last7Days" | "last30Days" {
  return period === "7d" ? "last7Days" : "last30Days";
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

  if (selectedRangeSessionCount > 0) return { kind: "none" };
  if (completedSessionCount === 0 || !lastSessionAt)
    return { kind: "noLogsEver" };

  return {
    kind: "noLogsInRange",
    rangeLabel: getRollingRange(getPreset(period), now).label.toLowerCase(),
    lastSessionAt,
    hasOlderHistory: true,
  };
}
