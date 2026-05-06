import type { SessionWithRole } from "@/types";
import { getLocalDayKey } from "@/utils/localDate";

const MIN_LOGS_FOR_INSIGHTS = 2;
const MIN_DAYS_FOR_TRENDS = 2;

function getUniqueDayCount(sessions: SessionWithRole[]): number {
  const completed = sessions.filter((s) => s.endAt != null);
  const daySet = new Set(completed.map((s) => getLocalDayKey(s.startAt)));
  return daySet.size;
}

export function hasEnoughDataForInsights(
  sessions: SessionWithRole[],
  minLogs = MIN_LOGS_FOR_INSIGHTS,
): boolean {
  const completed = sessions.filter((s) => s.endAt != null);
  return completed.length >= minLogs;
}

export function hasEnoughDataForTrends(sessions: SessionWithRole[]): boolean {
  return getUniqueDayCount(sessions) >= MIN_DAYS_FOR_TRENDS;
}
