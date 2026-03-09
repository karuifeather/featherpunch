import { Paths, File } from 'expo-file-system/next';
import * as Sharing from 'expo-sharing';
import type { Role, SessionWithRole } from '@/types';

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Used internally only — not exposed as standalone export. */
export function rolesToCsv(roles: Role[]): string {
  const header = 'id,name,tag,hourly_rate,color,icon,archived,created_at,updated_at';
  const rows = roles.map((r) =>
    [
      r.id, escapeCsv(r.name), r.tag, r.hourlyRate,
      r.color, r.icon, r.isArchived ? '1' : '0',
      r.createdAt, r.updatedAt,
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

export type SessionExportFieldKey =
  | 'id'
  | 'role_id'
  | 'role_name'
  | 'tag'
  | 'start_at'
  | 'end_at'
  | 'duration_minutes'
  | 'hourly_rate_at_time'
  | 'estimated_value'
  | 'source'
  | 'notes';

export const SESSION_EXPORT_FIELDS: { key: SessionExportFieldKey; label: string }[] = [
  { key: 'id', label: 'Session ID' },
  { key: 'role_id', label: 'Role ID' },
  { key: 'role_name', label: 'Role name' },
  { key: 'tag', label: 'Tag (me/other)' },
  { key: 'start_at', label: 'Start time' },
  { key: 'end_at', label: 'End time' },
  { key: 'duration_minutes', label: 'Duration (min)' },
  { key: 'hourly_rate_at_time', label: 'Hourly rate' },
  { key: 'estimated_value', label: 'Estimated value' },
  { key: 'source', label: 'Source' },
  { key: 'notes', label: 'Notes' },
];

function getSessionCell(s: SessionWithRole, key: SessionExportFieldKey): string {
  switch (key) {
    case 'id': return s.id;
    case 'role_id': return s.roleId;
    case 'role_name': return escapeCsv(s.roleName);
    case 'tag': return s.roleTag;
    case 'start_at': return s.startAt;
    case 'end_at': return s.endAt ?? '';
    case 'duration_minutes':
      return s.durationMs ? String(Math.round(s.durationMs / 60000 * 100) / 100) : '';
    case 'hourly_rate_at_time': return s.roleHourlyRate != null ? String(s.roleHourlyRate) : '';
    case 'estimated_value':
      return s.durationMs && s.roleHourlyRate
        ? String(Math.round((s.durationMs / 3600000) * s.roleHourlyRate * 100) / 100)
        : '';
    case 'source': return s.source;
    case 'notes': return escapeCsv(s.notes);
    default: return '';
  }
}

/** Build CSV for sessions with only the selected columns. */
export function sessionsToCsvWithFields(
  sessions: SessionWithRole[],
  fieldKeys: SessionExportFieldKey[]
): string {
  if (fieldKeys.length === 0) return '';
  const header = fieldKeys.join(',');
  const rows = sessions.map((s) =>
    fieldKeys.map((k) => getSessionCell(s, k)).join(',')
  );
  return [header, ...rows].join('\n');
}

export function sessionsToCsv(sessions: SessionWithRole[]): string {
  const allKeys = SESSION_EXPORT_FIELDS.map((f) => f.key);
  return sessionsToCsvWithFields(sessions, allKeys);
}

export async function exportCsvFile(
  filename: string,
  content: string
): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}
