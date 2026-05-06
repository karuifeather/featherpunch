import type { Role, RoleListSummary } from "@/types";
import { formatDurationShort, formatSinceTime } from "@/utils/formatTime";
import { startOfLocalDay } from "@/utils/localDate";

export type RoleFilter = "all" | "recent" | "paid" | "noLogs";

export type RoleListItemModel = {
  role: Role;
  summary: RoleListSummary;
  subtitle: string;
  paidSubtitle: string | null;
  chips: string[];
  rightMetric: string | null;
  rightBadge: "active" | null;
  estimatedLast30Earnings: number | null;
};

export function createEmptyRoleListSummary(roleId: string): RoleListSummary {
  return {
    roleId,
    isActive: false,
    activeStartedAt: null,
    lastCompletedSessionAt: null,
    lifetimeCompletedSessions: 0,
    last7DurationMs: 0,
    last30DurationMs: 0,
    last30CompletedSessions: 0,
  };
}

function formatCompactMoney(value: number): string {
  const rounded =
    value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `$${Number(rounded.toFixed(1)).toString()}`;
}

export function formatHourlyRate(rate: number): string {
  return `${formatCompactMoney(rate)}/hr`;
}

export function formatLastActiveLabel(
  isoString: string | null,
  now: Date = new Date(),
): string | null {
  if (!isoString) return null;
  const target = new Date(isoString);
  const todayStart = startOfLocalDay(now).getTime();
  const targetStart = startOfLocalDay(target).getTime();
  const dayDiff = Math.round((todayStart - targetStart) / 86_400_000);
  if (dayDiff === 0) return "today";
  if (dayDiff === 1) return "yesterday";
  return target.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function deriveRoleRowText(
  role: Role,
  summary: RoleListSummary,
  now: Date = new Date(),
): Pick<
  RoleListItemModel,
  | "subtitle"
  | "paidSubtitle"
  | "chips"
  | "rightMetric"
  | "rightBadge"
  | "estimatedLast30Earnings"
> {
  const estimatedLast30Earnings =
    role.hourlyRate != null
      ? (summary.last30DurationMs / 3_600_000) * role.hourlyRate
      : null;
  const lastActive = formatLastActiveLabel(summary.lastCompletedSessionAt, now);

  if (summary.isActive && summary.activeStartedAt) {
    const chips: string[] = [];
    if (summary.last7DurationMs > 0) {
      chips.push(`${formatDurationShort(summary.last7DurationMs)} last 7 days`);
    }
    if (estimatedLast30Earnings != null && summary.last30DurationMs > 0) {
      chips.push(`${formatCompactMoney(estimatedLast30Earnings)} est.`);
    }
    return {
      subtitle: `Active now\n${formatSinceTime(summary.activeStartedAt)}`,
      paidSubtitle:
        role.hourlyRate != null
          ? summary.last30DurationMs > 0
            ? `${formatHourlyRate(role.hourlyRate)} · ${formatCompactMoney(estimatedLast30Earnings ?? 0)} est. last 30 days`
            : `${formatHourlyRate(role.hourlyRate)} · No recent earnings`
          : null,
      chips,
      rightMetric: null,
      rightBadge: "active",
      estimatedLast30Earnings,
    };
  }

  if (summary.last7DurationMs > 0) {
    const chips: string[] = [
      `${formatDurationShort(summary.last7DurationMs)} last 7 days`,
    ];
    if (estimatedLast30Earnings != null && summary.last30DurationMs > 0) {
      chips.push(`${formatCompactMoney(estimatedLast30Earnings)} est.`);
    }
    return {
      subtitle: `Last active ${lastActive ?? "recently"}`,
      paidSubtitle:
        role.hourlyRate != null
          ? `${formatHourlyRate(role.hourlyRate)} · ${formatCompactMoney(estimatedLast30Earnings ?? 0)} est. last 30 days`
          : null,
      chips,
      rightMetric:
        estimatedLast30Earnings != null && summary.last30DurationMs > 0
          ? formatCompactMoney(estimatedLast30Earnings)
          : formatDurationShort(summary.last30DurationMs),
      rightBadge: null,
      estimatedLast30Earnings,
    };
  }

  if (summary.last30DurationMs > 0) {
    return {
      subtitle: `No time last 7 days · Last active ${lastActive ?? "recently"}`,
      paidSubtitle:
        role.hourlyRate != null
          ? `${formatHourlyRate(role.hourlyRate)} · ${formatCompactMoney(estimatedLast30Earnings ?? 0)} est. last 30 days`
          : null,
      chips: [`${formatDurationShort(summary.last30DurationMs)} last 30 days`],
      rightMetric:
        estimatedLast30Earnings != null
          ? formatCompactMoney(estimatedLast30Earnings)
          : formatDurationShort(summary.last30DurationMs),
      rightBadge: null,
      estimatedLast30Earnings,
    };
  }

  if (summary.lifetimeCompletedSessions > 0) {
    return {
      subtitle: `No recent time · Last active ${lastActive ?? "earlier"}`,
      paidSubtitle:
        role.hourlyRate != null
          ? `${formatHourlyRate(role.hourlyRate)} · No recent earnings`
          : null,
      chips: [],
      rightMetric: null,
      rightBadge: null,
      estimatedLast30Earnings,
    };
  }

  return {
    subtitle: "No logs yet",
    paidSubtitle:
      role.hourlyRate != null ? formatHourlyRate(role.hourlyRate) : null,
    chips: [],
    rightMetric: null,
    rightBadge: null,
    estimatedLast30Earnings,
  };
}

export function buildRoleListItemModel(
  role: Role,
  summary: RoleListSummary,
  now: Date = new Date(),
): RoleListItemModel {
  return {
    role,
    summary,
    ...deriveRoleRowText(role, summary, now),
  };
}

export function matchesRoleFilter(
  role: Role,
  summary: RoleListSummary,
  filter: RoleFilter,
): boolean {
  if (filter === "recent") return summary.last30CompletedSessions > 0;
  if (filter === "paid") return role.hourlyRate != null;
  if (filter === "noLogs") return summary.lifetimeCompletedSessions === 0;
  return true;
}

export function sortRecentFirst(
  items: RoleListItemModel[],
): RoleListItemModel[] {
  return [...items].sort((a, b) => {
    const aTime = a.summary.lastCompletedSessionAt
      ? new Date(a.summary.lastCompletedSessionAt).getTime()
      : -1;
    const bTime = b.summary.lastCompletedSessionAt
      ? new Date(b.summary.lastCompletedSessionAt).getTime()
      : -1;
    return bTime - aTime;
  });
}
