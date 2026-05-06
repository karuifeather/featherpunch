import type { AnalyticsSummary, SessionWithRole, InsightCard } from '@/types';
import { generateId } from '@/utils/uuid';

const MIN_LOGS_FOR_INSIGHTS = 3;
const MIN_DAYS_FOR_TRENDS = 2;
function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getUniqueDayCount(sessions: SessionWithRole[]): number {
  const completed = sessions.filter((s) => s.endAt != null);
  const daySet = new Set(
    completed.map((s) => new Date(s.startAt).toISOString().split('T')[0])
  );
  return daySet.size;
}

export function hasEnoughDataForInsights(
  sessions: SessionWithRole[],
  minLogs = MIN_LOGS_FOR_INSIGHTS
): boolean {
  const completed = sessions.filter((s) => s.endAt != null);
  return completed.length >= minLogs;
}

export function hasEnoughDataForTrends(sessions: SessionWithRole[]): boolean {
  return getUniqueDayCount(sessions) >= MIN_DAYS_FOR_TRENDS;
}

/** Today insights — only when enough data. Minimal, professional copy. */
export function generateTodayInsights(
  todaySessions: SessionWithRole[],
  analytics: AnalyticsSummary
): InsightCard[] {
  const completed = todaySessions.filter((s) => s.endAt != null);
  if (completed.length < MIN_LOGS_FOR_INSIGHTS) return [];

  const cards: InsightCard[] = [];

  if (analytics.mostFrequentRole && completed.length >= 2) {
    const top = analytics.roleStats[0];
    if (top && top.totalMs >= 5 * 60000) {
      cards.push({
        id: generateId(),
        text: `Most time today: ${top.roleName}`,
        type: 'neutral',
      });
    }
  }

  return cards.slice(0, 2);
}

/** Weekly insights — thresholds: min 3 logs, min 2 days for trends. */
export function generateWeeklyInsights(analytics: AnalyticsSummary): InsightCard[] {
  const { roleStats, sessionCount } = analytics;

  if (sessionCount < MIN_LOGS_FOR_INSIGHTS) return [];

  const cards: InsightCard[] = [];

  if (roleStats.length >= 2) {
    const top = roleStats[0];
    if (top && top.totalMs >= 5 * 60000) {
      cards.push({
        id: generateId(),
        text: `Most time: ${top.roleName} (${formatDuration(top.totalMs)})`,
        type: 'neutral',
      });
    }
  }

  return cards.slice(0, 2);
}
