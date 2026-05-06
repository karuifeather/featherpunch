import type { SessionWithRole, RoleStat, AnalyticsSummary } from "@/types";
import {
  getRollingRange,
  getRollingRangeQueryBounds,
} from "@/utils/dateRanges";
import {
  formatLocalDayLabel,
  getLocalDayKey,
  startOfLocalDay,
} from "@/utils/localDate";

export function computeAnalytics(
  sessions: SessionWithRole[],
): AnalyticsSummary {
  const completed = sessions.filter((s) => s.endAt !== null);

  let totalMs = 0;
  let meMs = 0;
  let otherMs = 0;
  let longestMs = 0;

  const roleMap = new Map<
    string,
    {
      roleId: string;
      roleName: string;
      roleColor: string;
      roleIcon: string;
      roleTag: SessionWithRole["roleTag"];
      totalMs: number;
      count: number;
    }
  >();

  for (const s of completed) {
    const dur = s.durationMs ?? 0;
    totalMs += dur;
    if (s.roleTag === "me") meMs += dur;
    else otherMs += dur;
    if (dur > longestMs) longestMs = dur;

    const existing = roleMap.get(s.roleId);
    if (existing) {
      existing.totalMs += dur;
      existing.count += 1;
    } else {
      roleMap.set(s.roleId, {
        roleId: s.roleId,
        roleName: s.roleName,
        roleColor: s.roleColor,
        roleIcon: s.roleIcon,
        roleTag: s.roleTag,
        totalMs: dur,
        count: 1,
      });
    }
  }

  const roleStats: RoleStat[] = Array.from(roleMap.values())
    .map((r) => ({
      ...r,
      sessionCount: r.count,
      avgSessionMs: r.count > 0 ? r.totalMs / r.count : 0,
    }))
    .sort((a, b) => b.totalMs - a.totalMs);

  const daySet = new Set(completed.map((s) => getLocalDayKey(s.startAt)));
  const dayCount = Math.max(daySet.size, 1);
  const switchesPerDay = completed.length / dayCount;

  return {
    totalMs,
    meMs,
    otherMs,
    mePercent: totalMs > 0 ? Math.round((meMs / totalMs) * 100) : 0,
    roleStats,
    sessionCount: completed.length,
    avgSessionMs: completed.length > 0 ? totalMs / completed.length : 0,
    mostFrequentRole: roleStats.length > 0 ? roleStats[0].roleName : null,
    longestSessionMs: longestMs,
    switchesPerDay: Math.round(switchesPerDay * 10) / 10,
  };
}

/** Returns daily time breakdown for charting (value in hours, label for x-axis) */
export function computeRoleTimeSeries(
  sessions: SessionWithRole[],
  period: "7d" | "30d",
): { dateKey: string; totalMs: number; label: string }[] {
  const dayMap = new Map<string, number>();
  const completed = sessions.filter((s) => s.endAt != null);

  for (const s of completed) {
    // Product policy for now: a cross-midnight session is grouped under its local start day.
    const dateKey = getLocalDayKey(s.startAt);
    const dur = s.durationMs ?? 0;
    dayMap.set(dateKey, (dayMap.get(dateKey) ?? 0) + dur);
  }

  const rollingRange = getRollingRange(
    period === "7d" ? "last7Days" : "last30Days",
  );
  const bounds = getRollingRangeQueryBounds(rollingRange);
  const start = new Date(bounds.startIso);
  const end = new Date(bounds.endExclusiveIso);

  const result: { dateKey: string; totalMs: number; label: string }[] = [];
  const today = startOfLocalDay(new Date());
  const d = new Date(start);
  while (d < end) {
    const dateKey = getLocalDayKey(d);
    const totalMs = dayMap.get(dateKey) ?? 0;
    const shortLabel =
      getLocalDayKey(d) === getLocalDayKey(today)
        ? "Today"
        : period === "7d"
          ? d.toLocaleDateString(undefined, { weekday: "short" })
          : formatLocalDayLabel(d);
    result.push({ dateKey, totalMs, label: shortLabel });
    d.setDate(d.getDate() + 1);
  }
  return result;
}

export function computeTodaySplit(sessions: SessionWithRole[]): {
  meMs: number;
  otherMs: number;
  totalMs: number;
  mePercent: number;
} {
  let meMs = 0;
  let otherMs = 0;

  for (const s of sessions) {
    const dur =
      s.durationMs ??
      (s.endAt
        ? new Date(s.endAt).getTime() - new Date(s.startAt).getTime()
        : Date.now() - new Date(s.startAt).getTime());
    if (s.roleTag === "me") meMs += dur;
    else otherMs += dur;
  }

  const totalMs = meMs + otherMs;
  return {
    meMs,
    otherMs,
    totalMs,
    mePercent: totalMs > 0 ? Math.round((meMs / totalMs) * 100) : 0,
  };
}
