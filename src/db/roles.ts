import * as SQLite from "expo-sqlite";
import { getDb } from "./database";
import { generateId } from "@/utils/uuid";
import type { Role, RoleDeletionSafety, RoleTag } from "@/types";

export const DELETE_ROLE_WITH_HISTORY_ERROR =
  "Cannot permanently delete a role with session history. Archive it instead.";

export class RoleDeleteBlockedError extends Error {
  readonly code = "ROLE_DELETE_BLOCKED";

  constructor(message = DELETE_ROLE_WITH_HISTORY_ERROR) {
    super(message);
    this.name = "RoleDeleteBlockedError";
  }
}

function rowToRole(row: Record<string, unknown>): Role {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    icon: row.icon as string,
    tag: row.tag as RoleTag,
    hourlyRate: row.hourly_rate as number | null,
    isArchived: (row.is_archived as number) === 1,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getAllRoles(includeArchived = false): Promise<Role[]> {
  const db = await getDb();
  const query = includeArchived
    ? "SELECT * FROM roles ORDER BY sort_order ASC, created_at ASC"
    : "SELECT * FROM roles WHERE is_archived = 0 ORDER BY sort_order ASC, created_at ASC";
  const rows = (await db.getAllAsync(query)) as Record<string, unknown>[];
  return rows.map(rowToRole);
}

export async function getRoleById(id: string): Promise<Role | null> {
  const db = await getDb();
  const row = await db.getFirstAsync("SELECT * FROM roles WHERE id = ?", [id]);
  return row ? rowToRole(row as Record<string, unknown>) : null;
}

export async function createRole(params: {
  name: string;
  color: string;
  icon: string;
  tag: RoleTag;
  hourlyRate?: number | null;
}): Promise<Role> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();
  const maxOrder = await db.getFirstAsync<{ m: number | null }>(
    "SELECT MAX(sort_order) as m FROM roles",
  );
  const sortOrder = (maxOrder?.m ?? -1) + 1;

  await db.runAsync(
    `INSERT INTO roles (id, name, color, icon, tag, hourly_rate, is_archived, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      id,
      params.name,
      params.color,
      params.icon,
      params.tag,
      params.hourlyRate ?? null,
      sortOrder,
      now,
      now,
    ],
  );

  return {
    id,
    name: params.name,
    color: params.color,
    icon: params.icon,
    tag: params.tag,
    hourlyRate: params.hourlyRate ?? null,
    isArchived: false,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateRole(
  id: string,
  params: Partial<{
    name: string;
    color: string;
    icon: string;
    tag: RoleTag;
    hourlyRate: number | null;
    isArchived: boolean;
    sortOrder: number;
  }>,
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (params.name !== undefined) {
    sets.push("name = ?");
    values.push(params.name);
  }
  if (params.color !== undefined) {
    sets.push("color = ?");
    values.push(params.color);
  }
  if (params.icon !== undefined) {
    sets.push("icon = ?");
    values.push(params.icon);
  }
  if (params.tag !== undefined) {
    sets.push("tag = ?");
    values.push(params.tag);
  }
  if (params.hourlyRate !== undefined) {
    sets.push("hourly_rate = ?");
    values.push(params.hourlyRate);
  }
  if (params.isArchived !== undefined) {
    sets.push("is_archived = ?");
    values.push(params.isArchived ? 1 : 0);
  }
  if (params.sortOrder !== undefined) {
    sets.push("sort_order = ?");
    values.push(params.sortOrder);
  }

  if (sets.length === 0) return;

  sets.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  await db.runAsync(
    `UPDATE roles SET ${sets.join(", ")} WHERE id = ?`,
    values as SQLite.SQLiteBindValue[],
  );
}

export async function deleteRole(id: string): Promise<void> {
  const db = await getDb();
  const sessionCountRow = await db.getFirstAsync<{ c: number | null }>(
    "SELECT COUNT(*) as c FROM sessions WHERE role_id = ?",
    [id],
  );
  const totalSessionCount = Number(sessionCountRow?.c ?? 0);
  if (totalSessionCount > 0) {
    throw new RoleDeleteBlockedError();
  }
  await db.runAsync("DELETE FROM roles WHERE id = ?", [id]);
}

export async function getRoleDeletionSafety(
  roleId: string,
): Promise<RoleDeletionSafety> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    completed_session_count: number | null;
    open_session_count: number | null;
    lifetime_duration_ms: number | null;
    last_session_at: string | null;
    is_active_role: number | null;
  }>(
    `SELECT
      SUM(CASE WHEN end_at IS NOT NULL THEN 1 ELSE 0 END) AS completed_session_count,
      SUM(CASE WHEN end_at IS NULL THEN 1 ELSE 0 END) AS open_session_count,
      COALESCE(SUM(CASE WHEN end_at IS NOT NULL THEN duration_ms ELSE 0 END), 0) AS lifetime_duration_ms,
      MAX(start_at) AS last_session_at,
      MAX(CASE WHEN end_at IS NULL THEN 1 ELSE 0 END) AS is_active_role
    FROM sessions
    WHERE role_id = ?`,
    [roleId],
  );

  const completedSessionCount = Number(row?.completed_session_count ?? 0);
  const openSessionCount = Number(row?.open_session_count ?? 0);
  const totalSessionCount = completedSessionCount + openSessionCount;
  const isActiveRole = Number(row?.is_active_role ?? 0) === 1;

  return {
    roleId,
    canDeletePermanently: totalSessionCount === 0 && !isActiveRole,
    completedSessionCount,
    openSessionCount,
    totalSessionCount,
    lifetimeDurationMs: Number(row?.lifetime_duration_ms ?? 0),
    lastSessionAt: row?.last_session_at ?? null,
    isActiveRole,
  };
}

export async function seedDefaultRoles(
  presets: Array<{
    name: string;
    icon: string;
    color: string;
    tag: RoleTag;
  }>,
): Promise<void> {
  const db = await getDb();
  const count = await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) as c FROM roles",
  );
  if ((count?.c ?? 0) > 0) return;

  const now = new Date().toISOString();
  for (let i = 0; i < presets.length; i++) {
    const p = presets[i];
    const id = generateId();
    await db.runAsync(
      `INSERT INTO roles (id, name, color, icon, tag, hourly_rate, is_archived, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, 0, ?, ?, ?)`,
      [id, p.name, p.color, p.icon, p.tag, i, now, now],
    );
  }
}
