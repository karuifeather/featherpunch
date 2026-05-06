import * as SQLite from "expo-sqlite";
import { getDb } from "./database";
import { generateId } from "@/utils/uuid";
import { startOfLocalDay, startOfNextLocalDay } from "@/utils/localDate";
import {
  getRollingRange,
  getRollingRangeQueryBounds,
} from "@/utils/dateRanges";
import type {
  CompletedSessionLogSummary,
  RoleListSummary,
  Session,
  SessionLogEntry,
  SessionSource,
  SessionWithRole,
} from "@/types";

export type RoleHistorySummary = {
  roleId: string;
  completedSessionCount: number;
  firstSessionAt: string | null;
  lastSessionAt: string | null;
  lifetimeDurationMs: number;
};

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    roleId: row.role_id as string,
    startAt: row.start_at as string,
    endAt: (row.end_at as string) || null,
    durationMs: row.duration_ms as number | null,
    hourlyRateSnapshot: (row.hourly_rate_snapshot as number) ?? null,
    estimatedEarningsSnapshot:
      (row.estimated_earnings_snapshot as number) ?? null,
    source: row.source as SessionSource,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToSessionWithRole(row: Record<string, unknown>): SessionWithRole {
  const hourlyRateSnapshot = (row.hourly_rate_snapshot as number) ?? null;
  const roleCurrentHourlyRate = (row.role_hourly_rate as number) ?? null;
  return {
    ...rowToSession(row),
    roleName: row.role_name as string,
    roleColor: row.role_color as string,
    roleIcon: row.role_icon as string,
    roleTag: row.role_tag as SessionWithRole["roleTag"],
    roleCurrentHourlyRate,
    roleHourlyRate: hourlyRateSnapshot ?? roleCurrentHourlyRate,
  };
}

const JOIN_QUERY = `
  SELECT s.*,
    r.name as role_name,
    r.color as role_color,
    r.icon as role_icon,
    r.tag as role_tag,
    r.hourly_rate as role_hourly_rate
  FROM sessions s
  JOIN roles r ON s.role_id = r.id
`;

export async function getActiveSession(): Promise<SessionWithRole | null> {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `${JOIN_QUERY} WHERE s.end_at IS NULL LIMIT 1`,
  );
  return row ? rowToSessionWithRole(row as Record<string, unknown>) : null;
}

export async function startSession(roleId: string): Promise<Session> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO sessions (id, role_id, start_at, end_at, duration_ms, hourly_rate_snapshot, estimated_earnings_snapshot, source, notes, created_at, updated_at)
     VALUES (?, ?, ?, NULL, NULL, NULL, NULL, 'manual', NULL, ?, ?)`,
    [id, roleId, now, now, now],
  );

  return {
    id,
    roleId,
    startAt: now,
    endAt: null,
    durationMs: null,
    hourlyRateSnapshot: null,
    estimatedEarningsSnapshot: null,
    source: "manual",
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function endSession(sessionId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const session = await db.getFirstAsync<{
    start_at: string;
    role_id: string;
    role_hourly_rate: number | null;
  }>(
    `SELECT s.start_at, s.role_id, r.hourly_rate AS role_hourly_rate
     FROM sessions s
     JOIN roles r ON r.id = s.role_id
     WHERE s.id = ?`,
    [sessionId],
  );
  if (!session) return;

  const durationMs =
    new Date(now).getTime() - new Date(session.start_at).getTime();
  const hourlyRateSnapshot =
    session.role_hourly_rate == null ? null : Number(session.role_hourly_rate);
  const estimatedEarningsSnapshot =
    hourlyRateSnapshot == null
      ? null
      : (durationMs / 3_600_000) * hourlyRateSnapshot;

  await db.runAsync(
    "UPDATE sessions SET end_at = ?, duration_ms = ?, hourly_rate_snapshot = ?, estimated_earnings_snapshot = ?, updated_at = ? WHERE id = ?",
    [
      now,
      durationMs,
      hourlyRateSnapshot,
      estimatedEarningsSnapshot,
      now,
      sessionId,
    ],
  );
}

export async function switchSession(
  currentSessionId: string,
  newRoleId: string,
): Promise<Session> {
  await endSession(currentSessionId);
  return startSession(newRoleId);
}

export async function getSessionsByDateRange(
  startDate: string,
  endDate: string,
): Promise<SessionWithRole[]> {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `${JOIN_QUERY}
     WHERE s.start_at >= ? AND s.start_at < ?
     ORDER BY s.start_at DESC`,
    [startDate, endDate],
  );
  return rows.map((r) => rowToSessionWithRole(r as Record<string, unknown>));
}

export async function getSessionsByRoleAndDateRange(
  roleId: string,
  startDate: string,
  endDate: string,
): Promise<SessionWithRole[]> {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `${JOIN_QUERY}
     WHERE s.role_id = ? AND s.start_at >= ? AND s.start_at < ? AND s.end_at IS NOT NULL
     ORDER BY s.start_at ASC`,
    [roleId, startDate, endDate],
  );
  return rows.map((r) => rowToSessionWithRole(r as Record<string, unknown>));
}

export async function getRoleHistorySummary(
  roleId: string,
): Promise<RoleHistorySummary> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    completed_session_count: number | null;
    first_session_at: string | null;
    last_session_at: string | null;
    lifetime_duration_ms: number | null;
  }>(
    `SELECT
      COUNT(*) AS completed_session_count,
      MIN(start_at) AS first_session_at,
      MAX(start_at) AS last_session_at,
      COALESCE(SUM(duration_ms), 0) AS lifetime_duration_ms
    FROM sessions
    WHERE role_id = ? AND end_at IS NOT NULL`,
    [roleId],
  );

  return {
    roleId,
    completedSessionCount: Number(row?.completed_session_count ?? 0),
    firstSessionAt: row?.first_session_at ?? null,
    lastSessionAt: row?.last_session_at ?? null,
    lifetimeDurationMs: Number(row?.lifetime_duration_ms ?? 0),
  };
}

export async function getRecentSessions(
  limit = 50,
): Promise<SessionWithRole[]> {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `${JOIN_QUERY} ORDER BY s.start_at DESC LIMIT ?`,
    [limit],
  );
  return rows.map((r) => rowToSessionWithRole(r as Record<string, unknown>));
}

export async function getAllSessions(): Promise<SessionWithRole[]> {
  const db = await getDb();
  const rows = await db.getAllAsync(`${JOIN_QUERY} ORDER BY s.start_at DESC`);
  return rows.map((r) => rowToSessionWithRole(r as Record<string, unknown>));
}

export async function getCompletedSessionLogs(
  options: {
    roleId?: string;
    startIso?: string;
    endExclusiveIso?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<SessionLogEntry[]> {
  const limit = options.limit ?? 100;
  return queryCompletedSessionLogs({
    roleId: options.roleId,
    startIso: options.startIso,
    endExclusiveIso: options.endExclusiveIso,
    limit,
    offset: options.offset ?? 0,
  });
}

export async function getCompletedSessionLogsForExport(
  options: {
    roleId?: string;
    startIso?: string;
    endExclusiveIso?: string;
  } = {},
): Promise<SessionLogEntry[]> {
  return queryCompletedSessionLogs(options);
}

async function queryCompletedSessionLogs(options: {
  roleId?: string;
  startIso?: string;
  endExclusiveIso?: string;
  limit?: number;
  offset?: number;
}): Promise<SessionLogEntry[]> {
  const db = await getDb();
  const where: string[] = ["s.end_at IS NOT NULL"];
  const params: SQLite.SQLiteBindValue[] = [];

  if (options.roleId) {
    where.push("s.role_id = ?");
    params.push(options.roleId);
  }
  if (options.startIso) {
    where.push("s.start_at >= ?");
    params.push(options.startIso);
  }
  if (options.endExclusiveIso) {
    where.push("s.start_at < ?");
    params.push(options.endExclusiveIso);
  }

  const queryParts = [
    `${JOIN_QUERY}`,
    `WHERE ${where.join(" AND ")}`,
    "ORDER BY s.start_at DESC",
  ];

  if (typeof options.limit === "number") {
    queryParts.push("LIMIT ?");
    params.push(options.limit);
    if (typeof options.offset === "number") {
      queryParts.push("OFFSET ?");
      params.push(options.offset);
    }
  }

  const rows = await db.getAllAsync(queryParts.join("\n"), params);

  return rows.map((row) => {
    const mapped = rowToSessionWithRole(row as Record<string, unknown>);
    return {
      id: mapped.id,
      roleId: mapped.roleId,
      roleName: mapped.roleName,
      roleColor: mapped.roleColor,
      roleIcon: mapped.roleIcon,
      roleHourlyRate: mapped.roleHourlyRate,
      estimatedEarnings: mapped.estimatedEarningsSnapshot,
      startAt: mapped.startAt,
      endAt: mapped.endAt ?? mapped.startAt,
      durationMs:
        mapped.durationMs ??
        Math.max(
          0,
          new Date(mapped.endAt ?? mapped.startAt).getTime() -
            new Date(mapped.startAt).getTime(),
        ),
      notes: mapped.notes,
    };
  });
}

export async function getRolesWithCompletedSessionHistory(): Promise<
  Array<{
    id: string;
    name: string;
  }>
> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
  }>(
    `SELECT DISTINCT r.id, r.name
     FROM roles r
     JOIN sessions s ON s.role_id = r.id
     WHERE s.end_at IS NOT NULL
     ORDER BY r.name COLLATE NOCASE ASC`,
  );
  return rows;
}

export async function getCompletedSessionLogSummary(options: {
  roleId: string;
  startIso?: string;
  endExclusiveIso?: string;
}): Promise<CompletedSessionLogSummary> {
  const db = await getDb();
  const where: string[] = ["s.role_id = ?", "s.end_at IS NOT NULL"];
  const params: SQLite.SQLiteBindValue[] = [options.roleId];

  if (options.startIso) {
    where.push("s.start_at >= ?");
    params.push(options.startIso);
  }
  if (options.endExclusiveIso) {
    where.push("s.start_at < ?");
    params.push(options.endExclusiveIso);
  }

  const row = await db.getFirstAsync<{
    completed_session_count: number | null;
    total_duration_ms: number | null;
    avg_hourly_rate_snapshot: number | null;
    total_estimated_earnings_snapshot: number | null;
  }>(
    `SELECT
      COUNT(*) AS completed_session_count,
      COALESCE(SUM(s.duration_ms), 0) AS total_duration_ms,
      AVG(s.hourly_rate_snapshot) AS avg_hourly_rate_snapshot,
      SUM(s.estimated_earnings_snapshot) AS total_estimated_earnings_snapshot
    FROM sessions s
    WHERE ${where.join(" AND ")}`,
    params,
  );

  const completedSessionCount = Number(row?.completed_session_count ?? 0);
  const totalDurationMs = Number(row?.total_duration_ms ?? 0);
  const hourlyRate =
    row?.avg_hourly_rate_snapshot == null
      ? null
      : Number(row.avg_hourly_rate_snapshot);
  const estimatedEarnings =
    row?.total_estimated_earnings_snapshot == null
      ? null
      : Number(row.total_estimated_earnings_snapshot);

  return {
    roleId: options.roleId,
    completedSessionCount,
    totalDurationMs,
    hourlyRate,
    estimatedEarnings,
  };
}

/** Returns sessions for the given role IDs. Empty roleIds = empty array. */
export async function getSessionsByRoleIds(
  roleIds: string[],
): Promise<SessionWithRole[]> {
  if (roleIds.length === 0) return [];
  const db = await getDb();
  const placeholders = roleIds.map(() => "?").join(",");
  const rows = await db.getAllAsync(
    `${JOIN_QUERY} WHERE s.role_id IN (${placeholders}) ORDER BY s.start_at DESC`,
    roleIds,
  );
  return rows.map((r) => rowToSessionWithRole(r as Record<string, unknown>));
}

export async function getRoleListSummaries(
  roleIds: string[],
  options?: {
    now?: Date;
  },
): Promise<RoleListSummary[]> {
  if (roleIds.length === 0) return [];
  const db = await getDb();
  const now = options?.now ?? new Date();
  const last7Range = getRollingRange("last7Days", now);
  const last30Range = getRollingRange("last30Days", now);
  const last7Bounds = getRollingRangeQueryBounds(last7Range);
  const last30Bounds = getRollingRangeQueryBounds(last30Range);
  const placeholders = roleIds.map(() => "?").join(",");

  const rows = await db.getAllAsync<{
    role_id: string;
    active_started_at: string | null;
    last_completed_session_at: string | null;
    lifetime_completed_sessions: number | null;
    last7_duration_ms: number | null;
    last30_duration_ms: number | null;
    last30_completed_sessions: number | null;
  }>(
    `SELECT
      s.role_id AS role_id,
      MAX(CASE WHEN s.end_at IS NULL THEN s.start_at END) AS active_started_at,
      MAX(CASE WHEN s.end_at IS NOT NULL THEN s.start_at END) AS last_completed_session_at,
      SUM(CASE WHEN s.end_at IS NOT NULL THEN 1 ELSE 0 END) AS lifetime_completed_sessions,
      COALESCE(
        SUM(
          CASE
            WHEN s.end_at IS NOT NULL AND s.start_at >= ? AND s.start_at < ? THEN COALESCE(s.duration_ms, 0)
            ELSE 0
          END
        ),
        0
      ) AS last7_duration_ms,
      COALESCE(
        SUM(
          CASE
            WHEN s.end_at IS NOT NULL AND s.start_at >= ? AND s.start_at < ? THEN COALESCE(s.duration_ms, 0)
            ELSE 0
          END
        ),
        0
      ) AS last30_duration_ms,
      SUM(
        CASE
          WHEN s.end_at IS NOT NULL AND s.start_at >= ? AND s.start_at < ? THEN 1
          ELSE 0
        END
      ) AS last30_completed_sessions
    FROM sessions s
    WHERE s.role_id IN (${placeholders})
    GROUP BY s.role_id`,
    [
      last7Bounds.startIso,
      last7Bounds.endExclusiveIso,
      last30Bounds.startIso,
      last30Bounds.endExclusiveIso,
      last30Bounds.startIso,
      last30Bounds.endExclusiveIso,
      ...roleIds,
    ],
  );

  const byRoleId = new Map(
    rows.map((row) => [
      row.role_id,
      {
        roleId: row.role_id,
        isActive: row.active_started_at != null,
        activeStartedAt: row.active_started_at ?? null,
        lastCompletedSessionAt: row.last_completed_session_at ?? null,
        lifetimeCompletedSessions: Number(row.lifetime_completed_sessions ?? 0),
        last7DurationMs: Number(row.last7_duration_ms ?? 0),
        last30DurationMs: Number(row.last30_duration_ms ?? 0),
        last30CompletedSessions: Number(row.last30_completed_sessions ?? 0),
      } satisfies RoleListSummary,
    ]),
  );

  return roleIds.map((roleId) => {
    return (
      byRoleId.get(roleId) ?? {
        roleId,
        isActive: false,
        activeStartedAt: null,
        lastCompletedSessionAt: null,
        lifetimeCompletedSessions: 0,
        last7DurationMs: 0,
        last30DurationMs: 0,
        last30CompletedSessions: 0,
      }
    );
  });
}

export async function updateSession(
  id: string,
  params: Partial<{
    startAt: string;
    endAt: string | null;
    notes: string | null;
    roleId: string;
  }>,
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (params.startAt !== undefined) {
    sets.push("start_at = ?");
    values.push(params.startAt);
  }
  if (params.endAt !== undefined) {
    sets.push("end_at = ?");
    values.push(params.endAt);
  }
  if (params.notes !== undefined) {
    sets.push("notes = ?");
    values.push(params.notes);
  }
  if (params.roleId !== undefined) {
    sets.push("role_id = ?");
    values.push(params.roleId);
  }

  if (sets.length === 0) return;

  sets.push("source = 'edited'");
  sets.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  if (params.startAt !== undefined || params.endAt !== undefined) {
    const row = await db.getFirstAsync<{
      start_at: string;
      end_at: string | null;
      role_id: string;
    }>("SELECT start_at, end_at, role_id FROM sessions WHERE id = ?", [id]);
    if (row) {
      const s = params.startAt ?? row.start_at;
      const e = params.endAt !== undefined ? params.endAt : row.end_at;
      if (e) {
        const dur = new Date(e).getTime() - new Date(s).getTime();
        sets.splice(sets.length - 2, 0, "duration_ms = ?");
        values.splice(values.length - 2, 0, dur);
        const effectiveRoleId = params.roleId ?? row.role_id;
        const roleRow = await db.getFirstAsync<{ hourly_rate: number | null }>(
          "SELECT hourly_rate FROM roles WHERE id = ?",
          [effectiveRoleId],
        );
        const hourlyRateSnapshot =
          roleRow?.hourly_rate == null ? null : Number(roleRow.hourly_rate);
        const estimatedEarningsSnapshot =
          hourlyRateSnapshot == null
            ? null
            : (dur / 3_600_000) * hourlyRateSnapshot;
        sets.splice(sets.length - 2, 0, "hourly_rate_snapshot = ?");
        values.splice(values.length - 2, 0, hourlyRateSnapshot);
        sets.splice(sets.length - 2, 0, "estimated_earnings_snapshot = ?");
        values.splice(values.length - 2, 0, estimatedEarningsSnapshot);
      } else if (params.endAt !== undefined) {
        sets.splice(sets.length - 2, 0, "duration_ms = ?");
        values.splice(values.length - 2, 0, null);
        sets.splice(sets.length - 2, 0, "hourly_rate_snapshot = ?");
        values.splice(values.length - 2, 0, null);
        sets.splice(sets.length - 2, 0, "estimated_earnings_snapshot = ?");
        values.splice(values.length - 2, 0, null);
      }
    }
  }

  await db.runAsync(
    `UPDATE sessions SET ${sets.join(", ")} WHERE id = ?`,
    values as SQLite.SQLiteBindValue[],
  );
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM sessions WHERE id = ?", [id]);
}

export async function getTodaySessions(): Promise<SessionWithRole[]> {
  const now = new Date();
  return getSessionsByDateRange(
    startOfLocalDay(now).toISOString(),
    startOfNextLocalDay(now).toISOString(),
  );
}

export async function getLastEngagedRoleId(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ role_id: string }>(
    `SELECT s.role_id
     FROM sessions s
     JOIN roles r ON r.id = s.role_id
     WHERE r.is_archived = 0
     ORDER BY s.start_at DESC
     LIMIT 1`,
  );
  return row?.role_id ?? null;
}
