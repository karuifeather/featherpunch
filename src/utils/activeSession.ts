import type { SessionWithRole } from "@/types";
import type { Role } from "@/types";

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
