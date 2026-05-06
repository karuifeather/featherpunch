import type { SessionWithRole } from "@/types";
import type { Role } from "@/types";
import { formatDurationShort } from "@/utils/formatTime";

export function getActiveElapsedMs(
  startAt: string,
  nowMs = Date.now(),
): number {
  const elapsed = nowMs - new Date(startAt).getTime();
  return elapsed > 0 ? elapsed : 0;
}

export type HomeTodaySummary = {
  completedMs: number;
  activeMs: number;
  completedPunchIns: number;
  activePunchIns: number;
  mostTimeToday: string | null;
};

export type HomeSummaryRow = {
  label: string;
  value: string;
  emphasize?: boolean;
};

export type InactiveHomeCardCopy = {
  kicker: string;
  roleName: string;
  statusLine: string;
  contextLine: string;
  ctaLabel: string;
  showChooseAnother: boolean;
};

export function deriveHomeTodaySummary(
  sessions: SessionWithRole[],
  active: { roleName: string; startAt: string } | null,
  nowMs = Date.now(),
): HomeTodaySummary {
  const completed = sessions.filter((session) => session.endAt !== null);
  const completedMs = completed.reduce(
    (sum, session) => sum + (session.durationMs ?? 0),
    0,
  );

  const activeMs = active ? getActiveElapsedMs(active.startAt, nowMs) : 0;
  const roleDurations = new Map<
    string,
    { roleName: string; durationMs: number }
  >();
  for (const session of completed) {
    const entry = roleDurations.get(session.roleId);
    const durationMs = session.durationMs ?? 0;
    if (entry) {
      entry.durationMs += durationMs;
    } else {
      roleDurations.set(session.roleId, {
        roleName: session.roleName,
        durationMs,
      });
    }
  }

  let mostTimeToday: string | null = null;
  let longestDurationMs = 0;
  for (const role of roleDurations.values()) {
    if (role.durationMs > longestDurationMs) {
      longestDurationMs = role.durationMs;
      mostTimeToday = role.roleName;
    }
  }

  if (!mostTimeToday && active) {
    mostTimeToday = active.roleName;
  }

  return {
    completedMs,
    activeMs,
    completedPunchIns: completed.length,
    activePunchIns: active ? 1 : 0,
    mostTimeToday,
  };
}

export function resolveLastEngagedRole(
  roleId: string | null,
  roles: Role[],
): Role | null {
  if (!roleId) return null;
  const role = roles.find((item) => item.id === roleId);
  if (!role || role.isArchived) return null;
  return role;
}

export function deriveHomeSummaryRows(params: {
  summary: HomeTodaySummary;
  hasActiveSession: boolean;
  activeNowLabel: string;
}): HomeSummaryRow[] {
  const { summary, hasActiveSession, activeNowLabel } = params;
  const punchInsValue =
    summary.activePunchIns > 0
      ? `${summary.completedPunchIns} completed · ${summary.activePunchIns} active`
      : `${summary.completedPunchIns}`;
  const commonRows: HomeSummaryRow[] = [
    {
      label: "Completed time",
      value: formatDurationShort(summary.completedMs),
    },
    {
      label: "Punch-ins",
      value: punchInsValue,
    },
    {
      label: "Most time today",
      value: summary.mostTimeToday || "—",
      emphasize: true,
    },
  ];
  if (!hasActiveSession) return commonRows;
  return [
    {
      label: "Active now",
      value: activeNowLabel,
    },
    ...commonRows,
  ];
}

export function deriveInactiveHomeCardCopy(params: {
  lastEngagedRole: Role | null;
  selectedRole: Role | null;
  summary: HomeTodaySummary;
}): InactiveHomeCardCopy {
  const role = params.lastEngagedRole ?? params.selectedRole;
  const hasCompletedToday = params.summary.completedMs > 0;
  const completedTodayLabel = hasCompletedToday
    ? `${formatDurationShort(params.summary.completedMs)} logged today`
    : null;

  if (!role) {
    return {
      kicker: "Ready to track",
      roleName: "Choose a role",
      statusLine: "Not currently tracking",
      contextLine: "Start your first session",
      ctaLabel: "Choose role",
      showChooseAnother: false,
    };
  }

  return {
    kicker: "Ready to track",
    roleName: role.name,
    statusLine: "Not currently tracking",
    contextLine:
      completedTodayLabel == null
        ? "Last active recently"
        : `${completedTodayLabel} · Last active today`,
    ctaLabel: `Clock in to ${role.name}`,
    showChooseAnother: true,
  };
}
