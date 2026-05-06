export type RoleTag = "me" | "other";
export type SessionSource = "manual" | "import" | "edited";

export interface Role {
  id: string;
  name: string;
  color: string;
  icon: string;
  tag: RoleTag;
  hourlyRate: number | null;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  roleId: string;
  startAt: string;
  endAt: string | null;
  durationMs: number | null;
  source: SessionSource;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionWithRole extends Session {
  roleName: string;
  roleColor: string;
  roleIcon: string;
  roleTag: RoleTag;
  roleHourlyRate: number | null;
}

export interface SessionLogEntry {
  id: string;
  roleId: string;
  roleName: string;
  roleColor: string;
  roleIcon: string;
  roleHourlyRate?: number | null;
  startAt: string;
  endAt: string;
  durationMs: number;
  notes: string | null;
}

export interface CompletedSessionLogSummary {
  roleId: string;
  completedSessionCount: number;
  totalDurationMs: number;
  hourlyRate: number | null;
  estimatedEarnings: number | null;
}

export interface ActiveSession {
  sessionId: string;
  roleId: string;
  roleName: string;
  roleColor: string;
  roleIcon: string;
  roleTag: RoleTag;
  startAt: string;
  elapsedMs: number;
}

export type RoleDeletionSafety = {
  roleId: string;
  canDeletePermanently: boolean;
  completedSessionCount: number;
  openSessionCount: number;
  totalSessionCount: number;
  lifetimeDurationMs: number;
  lastSessionAt: string | null;
  isActiveRole: boolean;
};

export interface RoleStat {
  roleId: string;
  roleName: string;
  roleColor: string;
  roleIcon: string;
  roleTag: RoleTag;
  totalMs: number;
  sessionCount: number;
  avgSessionMs: number;
}

export interface DaySummary {
  date: string;
  sessions: SessionWithRole[];
  totalMs: number;
  meMs: number;
  otherMs: number;
  switchCount: number;
}

export interface AnalyticsSummary {
  totalMs: number;
  meMs: number;
  otherMs: number;
  mePercent: number;
  roleStats: RoleStat[];
  sessionCount: number;
  avgSessionMs: number;
  mostFrequentRole: string | null;
  longestSessionMs: number;
  switchesPerDay: number;
}

export interface InsightCard {
  id: string;
  text: string;
  type: "neutral" | "positive" | "reflective" | "warning";
}

export type AppSettingKey =
  | "week_start_day"
  | "currency"
  | "privacy_lock"
  | "export_format"
  | "onboarding_completed"
  | "last_engaged_role_id"
  | "weather_latitude"
  | "weather_longitude"
  | "weather_label"
  | "weather_location_prompted"
  | "weather_temp_unit";
