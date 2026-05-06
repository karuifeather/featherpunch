import { computeAnalytics, computeRoleTimeSeries } from "@/services/analytics";
import { hasEnoughDataForTrends } from "@/services/insights";
import type { SessionWithRole } from "@/types";
import { getLocalDayKey } from "@/utils/localDate";

function buildSession(overrides: Partial<SessionWithRole>): SessionWithRole {
  return {
    id: "session-1",
    roleId: "role-1",
    startAt: "2026-01-02T10:00:00.000Z",
    endAt: "2026-01-02T11:00:00.000Z",
    durationMs: 60 * 60 * 1000,
    source: "manual",
    notes: null,
    createdAt: "2026-01-02T10:00:00.000Z",
    updatedAt: "2026-01-02T11:00:00.000Z",
    roleName: "Focus",
    roleColor: "#ffffff",
    roleIcon: "bolt",
    roleTag: "me",
    roleHourlyRate: null,
    ...overrides,
  };
}

describe("analytics local-day grouping", () => {
  it("uses the same local day key semantics across analytics and insights", () => {
    const first = buildSession({
      id: "a",
      startAt: "2026-01-02T23:30:00.000Z",
      durationMs: 20 * 60 * 1000,
    });
    const second = buildSession({
      id: "b",
      startAt: "2026-01-02T23:45:00.000Z",
      durationMs: 10 * 60 * 1000,
    });
    const third = buildSession({
      id: "c",
      startAt: "2026-01-03T01:00:00.000Z",
      durationMs: 10 * 60 * 1000,
    });
    const sessions = [first, second, third];

    const analytics = computeAnalytics(sessions);
    const groupedDays = new Set(sessions.map((s) => getLocalDayKey(s.startAt)));

    expect(analytics.sessionCount).toBe(3);
    expect(analytics.switchesPerDay).toBe(
      Math.round((sessions.length / groupedDays.size) * 10) / 10,
    );
    expect(hasEnoughDataForTrends(sessions)).toBe(groupedDays.size >= 2);
  });

  it("assigns cross-midnight session to the local start day bucket", () => {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      23,
      30,
      0,
      0,
    );
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      30,
      0,
      0,
    );
    const crossMidnight = buildSession({
      id: "x",
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      durationMs: 60 * 60 * 1000,
    });

    const series = computeRoleTimeSeries([crossMidnight], "7d");
    const startDayKey = getLocalDayKey(crossMidnight.startAt);
    const startDayEntry = series.find((entry) => entry.dateKey === startDayKey);

    expect(startDayEntry?.totalMs).toBe(60 * 60 * 1000);
    expect(series.reduce((sum, day) => sum + day.totalMs, 0)).toBe(
      60 * 60 * 1000,
    );
  });
});
