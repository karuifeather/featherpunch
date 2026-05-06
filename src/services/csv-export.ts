import { Paths, File } from "expo-file-system/next";
import * as Sharing from "expo-sharing";
import { getLocalDayKey } from "@/utils/localDate";
import { formatDurationShort, formatTime } from "@/utils/formatTime";
import type { CustomDateRange, LogsRangeFilter } from "@/utils/sessionLogs";
import type { Role, SessionLogEntry, SessionWithRole } from "@/types";

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Used internally only — not exposed as standalone export. */
export function rolesToCsv(roles: Role[]): string {
  const header =
    "id,name,hourly_rate,color,icon,archived,created_at,updated_at";
  const rows = roles.map((r) =>
    [
      r.id,
      escapeCsv(r.name),
      r.hourlyRate,
      r.color,
      r.icon,
      r.isArchived ? "1" : "0",
      r.createdAt,
      r.updatedAt,
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

export type SessionExportFieldKey =
  | "id"
  | "role_id"
  | "role_name"
  | "start_at"
  | "end_at"
  | "duration_minutes"
  | "hourly_rate_at_time"
  | "estimated_value"
  | "source"
  | "notes";

export const SESSION_EXPORT_FIELDS: {
  key: SessionExportFieldKey;
  label: string;
}[] = [
  { key: "id", label: "Session ID" },
  { key: "role_id", label: "Role ID" },
  { key: "role_name", label: "Role name" },
  { key: "start_at", label: "Start time" },
  { key: "end_at", label: "End time" },
  { key: "duration_minutes", label: "Duration (min)" },
  { key: "hourly_rate_at_time", label: "Hourly rate" },
  { key: "estimated_value", label: "Estimated value" },
  { key: "source", label: "Source" },
  { key: "notes", label: "Notes" },
];

function getSessionCell(
  s: SessionWithRole,
  key: SessionExportFieldKey,
): string {
  switch (key) {
    case "id":
      return s.id;
    case "role_id":
      return s.roleId;
    case "role_name":
      return escapeCsv(s.roleName);
    case "start_at":
      return s.startAt;
    case "end_at":
      return s.endAt ?? "";
    case "duration_minutes":
      return s.durationMs
        ? String(Math.round((s.durationMs / 60000) * 100) / 100)
        : "";
    case "hourly_rate_at_time":
      return s.roleHourlyRate != null ? String(s.roleHourlyRate) : "";
    case "estimated_value":
      return s.estimatedEarningsSnapshot != null
        ? String(Math.round(s.estimatedEarningsSnapshot * 100) / 100)
        : s.durationMs && s.roleHourlyRate
          ? String(
              Math.round((s.durationMs / 3600000) * s.roleHourlyRate * 100) /
                100,
            )
          : "";
    case "source":
      return s.source;
    case "notes":
      return escapeCsv(s.notes);
    default:
      return "";
  }
}

/** Build CSV for sessions with only the selected columns. */
export function sessionsToCsvWithFields(
  sessions: SessionWithRole[],
  fieldKeys: SessionExportFieldKey[],
): string {
  if (fieldKeys.length === 0) return "";
  const header = fieldKeys.join(",");
  const rows = sessions.map((s) =>
    fieldKeys.map((k) => getSessionCell(s, k)).join(","),
  );
  return [header, ...rows].join("\n");
}

export function sessionsToCsv(sessions: SessionWithRole[]): string {
  const allKeys = SESSION_EXPORT_FIELDS.map((f) => f.key);
  return sessionsToCsvWithFields(sessions, allKeys);
}

export const LOGS_EXPORT_COLUMNS = [
  "Date",
  "Role",
  "Start Time",
  "End Time",
  "Duration",
  "Duration Minutes",
  "Hourly Rate",
  "Estimated Earnings",
  "Notes",
  "Session ID",
] as const;

function formatDurationMinutes(ms: number): string {
  return String(Math.round((ms / 60000) * 100) / 100);
}

function formatMoneyNumber(value: number): string {
  return value.toFixed(2);
}

function toLogsExportRow(session: SessionLogEntry): string[] {
  const hourlyRate = session.roleHourlyRate ?? null;
  const estimatedEarnings =
    session.estimatedEarnings != null
      ? formatMoneyNumber(session.estimatedEarnings)
      : hourlyRate == null
        ? ""
        : formatMoneyNumber((session.durationMs / 3600000) * hourlyRate);
  return [
    getLocalDayKey(session.startAt),
    escapeCsv(session.roleName),
    escapeCsv(formatTime(session.startAt)),
    escapeCsv(formatTime(session.endAt)),
    escapeCsv(formatDurationShort(session.durationMs)),
    formatDurationMinutes(session.durationMs),
    hourlyRate == null ? "" : formatMoneyNumber(hourlyRate),
    estimatedEarnings,
    escapeCsv(session.notes),
    session.id,
  ];
}

export function sessionLogsToCsv(
  sessions: Array<SessionLogEntry | SessionWithRole>,
): string {
  const completedLogs: SessionLogEntry[] = sessions
    .filter((session) => session.endAt != null)
    .map((session) => {
      const durationMs =
        session.durationMs ??
        Math.max(
          0,
          new Date(session.endAt as string).getTime() -
            new Date(session.startAt).getTime(),
        );
      return {
        id: session.id,
        roleId: session.roleId,
        roleName: session.roleName,
        roleColor: session.roleColor,
        roleIcon: session.roleIcon,
        roleHourlyRate:
          "roleHourlyRate" in session ? (session.roleHourlyRate ?? null) : null,
        estimatedEarnings:
          "estimatedEarningsSnapshot" in session
            ? (session.estimatedEarningsSnapshot ?? null)
            : null,
        startAt: session.startAt,
        endAt: session.endAt as string,
        durationMs,
        notes: session.notes,
      };
    });

  const rows = completedLogs.map((session) =>
    toLogsExportRow(session).join(","),
  );
  return [LOGS_EXPORT_COLUMNS.join(","), ...rows].join("\n");
}

function slugifyValue(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toLocalYyyyMmDd(input: Date | string): string {
  const date = input instanceof Date ? input : new Date(input);
  return getLocalDayKey(date);
}

function getRangeSlug(selectedRange: LogsRangeFilter): string {
  switch (selectedRange) {
    case "last7Days":
      return "last-7-days";
    case "last30Days":
      return "last-30-days";
    case "last90Days":
      return "last-90-days";
    case "custom":
      return "custom";
    case "all":
      return "all";
    default:
      return "range";
  }
}

export function buildLogsExportFilename(options: {
  selectedRange: LogsRangeFilter;
  roleName?: string;
  customRange?: CustomDateRange | null;
  now?: Date;
}): string {
  const now = options.now ?? new Date();
  const roleSlug =
    options.roleName && options.roleName.trim().length > 0
      ? slugifyValue(options.roleName)
      : "logs";
  const prefix = `featherpunch-${roleSlug}`;

  if (options.selectedRange === "custom" && options.customRange) {
    const startDate = toLocalYyyyMmDd(options.customRange.startDate);
    const endDate = toLocalYyyyMmDd(options.customRange.endDate);
    return `${prefix}-custom-${startDate}-to-${endDate}.csv`;
  }

  if (options.selectedRange === "all") {
    return `${prefix}-all-latest.csv`;
  }

  const rangeSlug = getRangeSlug(options.selectedRange);
  return `${prefix}-${rangeSlug}-${toLocalYyyyMmDd(now)}.csv`;
}

export async function exportCsvFile(
  filename: string,
  content: string,
): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.create({ intermediates: true, overwrite: true });
  file.write(content);
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
  });
}
