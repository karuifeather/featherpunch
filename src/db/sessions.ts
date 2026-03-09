import * as SQLite from 'expo-sqlite';
import { getDb } from './database';
import { generateId } from '@/utils/uuid';
import type { Session, SessionWithRole, SessionSource } from '@/types';

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    roleId: row.role_id as string,
    startAt: row.start_at as string,
    endAt: (row.end_at as string) || null,
    durationMs: row.duration_ms as number | null,
    source: row.source as SessionSource,
    notes: (row.notes as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToSessionWithRole(row: Record<string, unknown>): SessionWithRole {
  return {
    ...rowToSession(row),
    roleName: row.role_name as string,
    roleColor: row.role_color as string,
    roleIcon: row.role_icon as string,
    roleTag: row.role_tag as SessionWithRole['roleTag'],
    roleHourlyRate: row.role_hourly_rate as number | null,
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
    `${JOIN_QUERY} WHERE s.end_at IS NULL LIMIT 1`
  );
  return row ? rowToSessionWithRole(row as Record<string, unknown>) : null;
}

export async function startSession(roleId: string): Promise<Session> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO sessions (id, role_id, start_at, end_at, duration_ms, source, notes, created_at, updated_at)
     VALUES (?, ?, ?, NULL, NULL, 'manual', NULL, ?, ?)`,
    [id, roleId, now, now, now]
  );

  return {
    id,
    roleId,
    startAt: now,
    endAt: null,
    durationMs: null,
    source: 'manual',
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function endSession(sessionId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const session = await db.getFirstAsync<{ start_at: string }>(
    'SELECT start_at FROM sessions WHERE id = ?',
    [sessionId]
  );
  if (!session) return;

  const durationMs = new Date(now).getTime() - new Date(session.start_at).getTime();

  await db.runAsync(
    'UPDATE sessions SET end_at = ?, duration_ms = ?, updated_at = ? WHERE id = ?',
    [now, durationMs, now, sessionId]
  );
}

export async function switchSession(
  currentSessionId: string,
  newRoleId: string
): Promise<Session> {
  await endSession(currentSessionId);
  return startSession(newRoleId);
}

export async function getSessionsByDateRange(
  startDate: string,
  endDate: string
): Promise<SessionWithRole[]> {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `${JOIN_QUERY}
     WHERE s.start_at >= ? AND s.start_at < ?
     ORDER BY s.start_at DESC`,
    [startDate, endDate]
  );
  return rows.map((r) => rowToSessionWithRole(r as Record<string, unknown>));
}

export async function getSessionsByRoleAndDateRange(
  roleId: string,
  startDate: string,
  endDate: string
): Promise<SessionWithRole[]> {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `${JOIN_QUERY}
     WHERE s.role_id = ? AND s.start_at >= ? AND s.start_at < ? AND s.end_at IS NOT NULL
     ORDER BY s.start_at ASC`,
    [roleId, startDate, endDate]
  );
  return rows.map((r) => rowToSessionWithRole(r as Record<string, unknown>));
}

export async function getRecentSessions(limit = 50): Promise<SessionWithRole[]> {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `${JOIN_QUERY} ORDER BY s.start_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map((r) => rowToSessionWithRole(r as Record<string, unknown>));
}

export async function getAllSessions(): Promise<SessionWithRole[]> {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `${JOIN_QUERY} ORDER BY s.start_at DESC`
  );
  return rows.map((r) => rowToSessionWithRole(r as Record<string, unknown>));
}

/** Returns sessions for the given role IDs. Empty roleIds = empty array. */
export async function getSessionsByRoleIds(roleIds: string[]): Promise<SessionWithRole[]> {
  if (roleIds.length === 0) return [];
  const db = await getDb();
  const placeholders = roleIds.map(() => '?').join(',');
  const rows = await db.getAllAsync(
    `${JOIN_QUERY} WHERE s.role_id IN (${placeholders}) ORDER BY s.start_at DESC`,
    roleIds
  );
  return rows.map((r) => rowToSessionWithRole(r as Record<string, unknown>));
}

export async function updateSession(
  id: string,
  params: Partial<{
    startAt: string;
    endAt: string | null;
    notes: string | null;
    roleId: string;
  }>
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (params.startAt !== undefined) { sets.push('start_at = ?'); values.push(params.startAt); }
  if (params.endAt !== undefined) { sets.push('end_at = ?'); values.push(params.endAt); }
  if (params.notes !== undefined) { sets.push('notes = ?'); values.push(params.notes); }
  if (params.roleId !== undefined) { sets.push('role_id = ?'); values.push(params.roleId); }

  if (sets.length === 0) return;

  sets.push("source = 'edited'");
  sets.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  if (params.startAt !== undefined || params.endAt !== undefined) {
    const row = await db.getFirstAsync<{ start_at: string; end_at: string | null }>(
      'SELECT start_at, end_at FROM sessions WHERE id = ?',
      [id]
    );
    if (row) {
      const s = params.startAt ?? row.start_at;
      const e = params.endAt !== undefined ? params.endAt : row.end_at;
      if (e) {
        const dur = new Date(e).getTime() - new Date(s).getTime();
        sets.splice(sets.length - 2, 0, 'duration_ms = ?');
        values.splice(values.length - 2, 0, dur);
      } else if (params.endAt !== undefined) {
        sets.splice(sets.length - 2, 0, 'duration_ms = ?');
        values.splice(values.length - 2, 0, null);
      }
    }
  }

  await db.runAsync(`UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`, values as SQLite.SQLiteBindValue[]);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
}

export async function getTodaySessions(): Promise<SessionWithRole[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return getSessionsByDateRange(startOfDay, endOfDay);
}
