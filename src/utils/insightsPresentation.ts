import type { RoleStat, SessionWithRole } from "@/types";
import type { RollingRange } from "@/utils/dateRanges";
import { getLocalDayKey } from "@/utils/localDate";
import { formatDurationShort } from "@/utils/formatTime";

export const INSIGHT_THRESHOLDS = {
  minMeaningfulDurationMs: 5 * 60 * 1000,
  minSessionsForPatterns: 2,
  minSessionsForStartWindow: 3,
  dominantRoleShare: 0.8,
  minSessionsDeltaForClaim: 2,
  roleContributionShare: 0.5,
} as const;

export type KeyTakeaway = {
  title: string;
  body: string;
  tone: "positive" | "neutral" | "quiet" | "warning";
};

export type ChangeExplanation = {
  label: string;
  detail: string;
  kind: "increase" | "decrease" | "same" | "new" | "paused" | "none";
};

export type RoleComparisonRow = {
  roleId: string;
  roleName: string;
  roleColor: string;
  roleIcon: string;
  totalMs: number;
  sessionCount: number;
  avgSessionMs: number;
  sharePercent: number;
  deltaMs: number;
  deltaCopy: string | null;
  isDroppedFromPrevious: boolean;
};

export type PatternInsights = {
  activeDays: number;
  mostActiveDay: { label: string; totalMs: number } | null;
  startWindowLabel: string | null;
};

export type EarningsInsight = {
  totalEstimatedCents: number;
  paidSessionCount: number;
  paidDurationMs: number;
  unpaidDurationMs: number;
  topPaidRole: {
    roleId: string;
    name: string;
    estimatedCents: number;
  } | null;
  averagePerPaidSessionCents: number | null;
};

export function formatInsightsRangeLabel(range: RollingRange): string {
  return `${range.label} · ${range.displayRange}`;
}

export function deriveInsightsEmptyState(params: {
  selectedRangeLabel: string;
  selectedCompletedCount: number;
  totalCompletedCount: number;
  lastCompleted: { roleName: string; startAt: string } | null;
}): { title: string; body?: string; cta?: string } {
  const {
    selectedRangeLabel,
    selectedCompletedCount,
    totalCompletedCount,
    lastCompleted,
  } = params;
  if (selectedCompletedCount > 0) {
    return { title: "" };
  }
  if (totalCompletedCount === 0) {
    return {
      title: "No completed shifts yet",
      body: "Clock in and punch out to create your first insight.",
    };
  }
  if (lastCompleted) {
    const lastDate = new Date(lastCompleted.startAt).toLocaleDateString(
      undefined,
      { month: "short", day: "numeric" },
    );
    return {
      title: `No completed sessions in ${selectedRangeLabel.toLowerCase()}`,
      body: `Last tracked ${lastCompleted.roleName} on ${lastDate}`,
      cta: "Try a wider range",
    };
  }
  return {
    title: `No completed sessions in ${selectedRangeLabel.toLowerCase()}`,
  };
}

export function getSessionComparisonCopy(
  currentCount: number,
  previousCount: number,
  label: string,
): string {
  if (previousCount === 0 && currentCount === 0) {
    return `No sessions in either ${label.toLowerCase()}`;
  }
  if (previousCount === 0 && currentCount > 0)
    return "New activity this period";
  const diff = currentCount - previousCount;
  if (Math.abs(diff) <= 1) {
    return `About the same sessions as previous ${label.toLowerCase()}`;
  }
  if (diff === 0) return `Same sessions as previous ${label.toLowerCase()}`;
  if (diff > 0) {
    return `${diff} more session${diff === 1 ? "" : "s"} than previous ${label.toLowerCase()}`;
  }
  const fewer = Math.abs(diff);
  return `${fewer} fewer session${fewer === 1 ? "" : "s"} than previous ${label.toLowerCase()}`;
}

export function getTopRoleChangeCopy(
  currentTop: RoleStat | null,
  previousTop: RoleStat | null,
): string | null {
  if (!currentTop && !previousTop) return null;
  if (currentTop && !previousTop)
    return `Top role is new: ${currentTop.roleName}`;
  if (!currentTop && previousTop) return "No top role this period";
  if (!currentTop || !previousTop) return null;
  if (currentTop.roleId === previousTop.roleId) {
    return `Top role unchanged: ${currentTop.roleName}`;
  }
  return `Top role changed: ${previousTop.roleName} -> ${currentTop.roleName}`;
}

export function getMostActiveDay(sessions: SessionWithRole[]): {
  label: string;
  totalMs: number;
} | null {
  const completed = sessions.filter((s) => s.endAt != null);
  if (completed.length === 0) return null;
  const byDay = new Map<string, number>();
  for (const session of completed) {
    const dayKey = getLocalDayKey(session.startAt);
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + (session.durationMs ?? 0));
  }
  let winningKey: string | null = null;
  let winningMs = 0;
  for (const [key, ms] of byDay.entries()) {
    if (ms > winningMs) {
      winningKey = key;
      winningMs = ms;
    }
  }
  if (!winningKey) return null;
  const [year, month, day] = winningKey.split("-").map(Number);
  const asDate = new Date(year, month - 1, day);
  return {
    label: asDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    totalMs: winningMs,
  };
}

export function getTotalComparisonCopy(
  currentMs: number,
  previousMs: number,
  label: string,
): string {
  if (currentMs === 0 && previousMs === 0)
    return `No activity in either ${label}`;
  if (previousMs === 0 && currentMs > 0) return "New activity this period";
  if (currentMs === 0 && previousMs > 0) return "Activity paused this period";
  const diff = currentMs - previousMs;
  if (Math.abs(diff) < INSIGHT_THRESHOLDS.minMeaningfulDurationMs) {
    return `About the same as previous ${label}`;
  }
  const sign = diff > 0 ? "+" : "-";
  return `${sign}${formatDurationShort(Math.abs(diff))} vs previous ${label}`;
}

export function buildRoleComparisonRows(params: {
  currentRoleStats: RoleStat[];
  previousRoleStats: RoleStat[];
  totalCurrentMs: number;
  totalPreviousMs: number;
  rangeShortLabel: string;
}): RoleComparisonRow[] {
  const {
    currentRoleStats,
    previousRoleStats,
    totalCurrentMs,
    totalPreviousMs,
    rangeShortLabel,
  } = params;
  const previousById = new Map(
    previousRoleStats.map((role) => [role.roleId, role]),
  );
  const rows: RoleComparisonRow[] = currentRoleStats.map((role) => {
    const previous = previousById.get(role.roleId);
    const deltaMs = role.totalMs - (previous?.totalMs ?? 0);
    return {
      roleId: role.roleId,
      roleName: role.roleName,
      roleColor: role.roleColor,
      roleIcon: role.roleIcon,
      totalMs: role.totalMs,
      sessionCount: role.sessionCount,
      avgSessionMs: role.avgSessionMs,
      sharePercent:
        totalCurrentMs <= 0
          ? 0
          : Math.round((role.totalMs / totalCurrentMs) * 100),
      deltaMs,
      deltaCopy: formatRoleDelta(deltaMs, rangeShortLabel),
      isDroppedFromPrevious: false,
    };
  });

  const shouldShowDroppedRoles =
    totalCurrentMs < totalPreviousMs &&
    Math.abs(totalCurrentMs - totalPreviousMs) >=
      INSIGHT_THRESHOLDS.minMeaningfulDurationMs;
  if (shouldShowDroppedRoles) {
    const currentIds = new Set(currentRoleStats.map((role) => role.roleId));
    const dropped = previousRoleStats
      .filter(
        (role) =>
          !currentIds.has(role.roleId) &&
          role.totalMs >= INSIGHT_THRESHOLDS.minMeaningfulDurationMs,
      )
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, 1)
      .map((role) => ({
        roleId: role.roleId,
        roleName: role.roleName,
        roleColor: role.roleColor,
        roleIcon: role.roleIcon,
        totalMs: 0,
        sessionCount: 0,
        avgSessionMs: 0,
        sharePercent: 0,
        deltaMs: -role.totalMs,
        deltaCopy: `No activity this period (${formatDurationShort(role.totalMs)} in previous ${rangeShortLabel})`,
        isDroppedFromPrevious: true,
      }));
    rows.push(...dropped);
  }

  return rows.sort((a, b) => b.totalMs - a.totalMs || b.deltaMs - a.deltaMs);
}

function formatRoleDelta(
  deltaMs: number,
  rangeShortLabel: string,
): string | null {
  if (Math.abs(deltaMs) < INSIGHT_THRESHOLDS.minMeaningfulDurationMs) {
    return `About the same as previous ${rangeShortLabel}`;
  }
  const sign = deltaMs > 0 ? "+" : "-";
  return `${sign}${formatDurationShort(Math.abs(deltaMs))} vs previous ${rangeShortLabel}`;
}

export function deriveChangeExplanation(params: {
  currentTotalMs: number;
  previousTotalMs: number;
  currentSessionCount: number;
  previousSessionCount: number;
  currentAvgSessionMs: number;
  previousAvgSessionMs: number;
  currentRoleStats: RoleStat[];
  previousRoleStats: RoleStat[];
  rangeShortLabel: string;
}): ChangeExplanation {
  const {
    currentTotalMs,
    previousTotalMs,
    currentSessionCount,
    previousSessionCount,
    currentAvgSessionMs,
    previousAvgSessionMs,
    currentRoleStats,
    previousRoleStats,
    rangeShortLabel,
  } = params;
  if (previousTotalMs === 0 && currentTotalMs > 0) {
    return {
      label: "New activity this period",
      detail: `No tracked time in previous ${rangeShortLabel}.`,
      kind: "new",
    };
  }
  if (currentTotalMs === 0 && previousTotalMs > 0) {
    return {
      label: "Activity paused this period",
      detail: `There was tracked time in previous ${rangeShortLabel}.`,
      kind: "paused",
    };
  }
  const totalDiff = currentTotalMs - previousTotalMs;
  if (Math.abs(totalDiff) < INSIGHT_THRESHOLDS.minMeaningfulDurationMs) {
    return {
      label: "Total tracked stayed about the same",
      detail: `Less than ${formatDurationShort(INSIGHT_THRESHOLDS.minMeaningfulDurationMs)} difference from previous ${rangeShortLabel}.`,
      kind: "same",
    };
  }

  const previousByRole = new Map(
    previousRoleStats.map((role) => [role.roleId, role.totalMs]),
  );
  let topContribution: { roleName: string; deltaMs: number } | null = null;
  for (const role of currentRoleStats) {
    const deltaMs = role.totalMs - (previousByRole.get(role.roleId) ?? 0);
    if (
      topContribution == null ||
      Math.abs(deltaMs) > Math.abs(topContribution.deltaMs)
    ) {
      topContribution = { roleName: role.roleName, deltaMs };
    }
  }
  for (const role of previousRoleStats) {
    if (currentRoleStats.some((current) => current.roleId === role.roleId))
      continue;
    const deltaMs = -role.totalMs;
    if (
      topContribution == null ||
      Math.abs(deltaMs) > Math.abs(topContribution.deltaMs)
    ) {
      topContribution = { roleName: role.roleName, deltaMs };
    }
  }

  if (
    topContribution &&
    Math.abs(topContribution.deltaMs) >=
      INSIGHT_THRESHOLDS.minMeaningfulDurationMs &&
    Math.abs(topContribution.deltaMs) / Math.abs(totalDiff) >=
      INSIGHT_THRESHOLDS.roleContributionShare
  ) {
    const trend = totalDiff > 0 ? "increase" : "decrease";
    return {
      label: `Main driver of ${trend}`,
      detail: `${topContribution.roleName} changed by ${formatDurationShort(Math.abs(topContribution.deltaMs))}.`,
      kind: totalDiff > 0 ? "increase" : "decrease",
    };
  }

  const sessionDiff = currentSessionCount - previousSessionCount;
  if (Math.abs(sessionDiff) >= INSIGHT_THRESHOLDS.minSessionsDeltaForClaim) {
    return {
      label: "Session count shifted",
      detail:
        sessionDiff > 0
          ? `${sessionDiff} more completed sessions than previous ${rangeShortLabel}.`
          : `${Math.abs(sessionDiff)} fewer completed sessions than previous ${rangeShortLabel}.`,
      kind: totalDiff > 0 ? "increase" : "decrease",
    };
  }

  const avgDiff = currentAvgSessionMs - previousAvgSessionMs;
  if (Math.abs(avgDiff) >= INSIGHT_THRESHOLDS.minMeaningfulDurationMs) {
    return {
      label: "Session length changed",
      detail:
        avgDiff > 0
          ? `Average session was ${formatDurationShort(avgDiff)} longer.`
          : `Average session was ${formatDurationShort(Math.abs(avgDiff))} shorter.`,
      kind: totalDiff > 0 ? "increase" : "decrease",
    };
  }

  return {
    label: totalDiff > 0 ? "Tracked time increased" : "Tracked time decreased",
    detail: `${formatDurationShort(Math.abs(totalDiff))} difference from previous ${rangeShortLabel}.`,
    kind: totalDiff > 0 ? "increase" : "decrease",
  };
}

export function deriveKeyTakeaway(params: {
  currentTotalMs: number;
  previousTotalMs: number;
  currentSessionCount: number;
  currentTopRole: RoleStat | null;
  currentRangeLabel: string;
  currentRangeShortLabel: string;
  lastCompleted: { roleName: string; startAt: string } | null;
}): KeyTakeaway {
  const {
    currentTotalMs,
    previousTotalMs,
    currentSessionCount,
    currentTopRole,
    currentRangeLabel,
    currentRangeShortLabel,
    lastCompleted,
  } = params;
  if (currentSessionCount === 0) {
    if (lastCompleted) {
      const when = new Date(lastCompleted.startAt).toLocaleDateString(
        undefined,
        {
          month: "short",
          day: "numeric",
        },
      );
      return {
        title: `No completed sessions in ${currentRangeLabel.toLowerCase()}.`,
        body: `Last tracked ${lastCompleted.roleName} on ${when}.`,
        tone: "quiet",
      };
    }
    return {
      title: "No completed shifts yet.",
      body: "Clock in and punch out to create your first insight.",
      tone: "warning",
    };
  }
  if (previousTotalMs === 0 && currentTotalMs > 0) {
    return {
      title: "New activity this period.",
      body: `There was no activity in the previous ${currentRangeShortLabel}.`,
      tone: "positive",
    };
  }
  const diff = currentTotalMs - previousTotalMs;
  if (Math.abs(diff) < INSIGHT_THRESHOLDS.minMeaningfulDurationMs) {
    return {
      title: "You logged about the same amount of time.",
      body: `Total tracked time is similar to the previous ${currentRangeShortLabel}.`,
      tone: "neutral",
    };
  }
  if (
    currentTopRole &&
    currentTotalMs >= INSIGHT_THRESHOLDS.minMeaningfulDurationMs &&
    currentTopRole.totalMs / currentTotalMs >=
      INSIGHT_THRESHOLDS.dominantRoleShare
  ) {
    return {
      title: `${currentTopRole.roleName} dominated this period.`,
      body: `${currentTopRole.roleName} made up ${Math.round((currentTopRole.totalMs / currentTotalMs) * 100)}% of tracked time.`,
      tone: "neutral",
    };
  }
  if (diff > 0) {
    return {
      title: `You tracked ${formatDurationShort(diff)} more than before.`,
      body: `Compared with the previous ${currentRangeShortLabel}.`,
      tone: "positive",
    };
  }
  return {
    title: `You tracked ${formatDurationShort(Math.abs(diff))} less than before.`,
    body: `Compared with the previous ${currentRangeShortLabel}.`,
    tone: "quiet",
  };
}

export function derivePatternInsights(
  sessions: SessionWithRole[],
): PatternInsights {
  const completed = sessions.filter((session) => session.endAt != null);
  const activeDays = new Set(
    completed.map((session) => getLocalDayKey(session.startAt)),
  ).size;
  const mostActiveDay = getMostActiveDay(completed);
  const startWindowLabel =
    completed.length >= INSIGHT_THRESHOLDS.minSessionsForStartWindow
      ? getMostCommonStartWindow(completed)
      : null;
  return { activeDays, mostActiveDay, startWindowLabel };
}

function getMostCommonStartWindow(sessions: SessionWithRole[]): string | null {
  const buckets = new Map<string, number>([
    ["Morning", 0],
    ["Afternoon", 0],
    ["Evening", 0],
    ["Night", 0],
  ]);
  for (const session of sessions) {
    const hour = new Date(session.startAt).getHours();
    const label =
      hour >= 5 && hour < 12
        ? "Morning"
        : hour >= 12 && hour < 17
          ? "Afternoon"
          : hour >= 17 && hour < 21
            ? "Evening"
            : "Night";
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }
  let winner: string | null = null;
  let winnerCount = 0;
  for (const [label, count] of buckets.entries()) {
    if (count > winnerCount) {
      winner = label;
      winnerCount = count;
    }
  }
  return winnerCount === 0 ? null : winner;
}

export function deriveEarningsInsight(
  sessions: SessionWithRole[],
): EarningsInsight | null {
  const completed = sessions.filter((session) => session.endAt != null);
  const paidSessions = completed.filter(
    (session) => session.roleHourlyRate != null && session.roleHourlyRate > 0,
  );
  if (paidSessions.length === 0) return null;

  let totalEstimatedCents = 0;
  let paidDurationMs = 0;
  let unpaidDurationMs = 0;
  const earningsByRole = new Map<
    string,
    { name: string; estimatedCents: number; roleId: string }
  >();
  for (const session of completed) {
    const durationMs = session.durationMs ?? 0;
    if (session.roleHourlyRate != null && session.roleHourlyRate > 0) {
      paidDurationMs += durationMs;
      const cents = Math.round(
        (durationMs / 3_600_000) * session.roleHourlyRate * 100,
      );
      totalEstimatedCents += cents;
      const existing = earningsByRole.get(session.roleId);
      if (existing) existing.estimatedCents += cents;
      else {
        earningsByRole.set(session.roleId, {
          roleId: session.roleId,
          name: session.roleName,
          estimatedCents: cents,
        });
      }
    } else {
      unpaidDurationMs += durationMs;
    }
  }
  const topPaidRole =
    Array.from(earningsByRole.values()).sort(
      (a, b) => b.estimatedCents - a.estimatedCents,
    )[0] ?? null;
  return {
    totalEstimatedCents,
    paidSessionCount: paidSessions.length,
    paidDurationMs,
    unpaidDurationMs,
    topPaidRole,
    averagePerPaidSessionCents:
      paidSessions.length > 0
        ? Math.round(totalEstimatedCents / paidSessions.length)
        : null,
  };
}
