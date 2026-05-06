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

  it("includes Apr 30 and May 1 in rolling last 7 days for May 6", () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date(2026, 4, 6, 12, 0, 0, 0));

      const apr29 = buildSession({
        id: "old",
        startAt: new Date(2026, 3, 29, 10, 0, 0, 0).toISOString(),
        endAt: new Date(2026, 3, 29, 11, 0, 0, 0).toISOString(),
        durationMs: 60 * 60 * 1000,
      });
      const apr30 = buildSession({
        id: "a",
        startAt: new Date(2026, 3, 30, 10, 0, 0, 0).toISOString(),
        endAt: new Date(2026, 3, 30, 11, 0, 0, 0).toISOString(),
        durationMs: 60 * 60 * 1000,
      });
      const may1 = buildSession({
        id: "b",
        startAt: new Date(2026, 4, 1, 10, 0, 0, 0).toISOString(),
        endAt: new Date(2026, 4, 1, 11, 0, 0, 0).toISOString(),
        durationMs: 30 * 60 * 1000,
      });

      const series = computeRoleTimeSeries([apr29, apr30, may1], "7d");
      const keys = series.map((entry) => entry.dateKey);
      const apr30Key = getLocalDayKey(apr30.startAt);
      const may1Key = getLocalDayKey(may1.startAt);
      const apr29Key = getLocalDayKey(apr29.startAt);

      expect(series).toHaveLength(7);
      expect(keys).toContain(apr30Key);
      expect(keys).toContain(may1Key);
      expect(keys).not.toContain(apr29Key);
      expect(series.find((entry) => entry.dateKey === apr30Key)?.totalMs).toBe(
        60 * 60 * 1000,
      );
      expect(series.find((entry) => entry.dateKey === may1Key)?.totalMs).toBe(
        30 * 60 * 1000,
      );
      const apr30Label = series.find(
        (entry) => entry.dateKey === apr30Key,
      )?.label;
      const may1Label = series.find(
        (entry) => entry.dateKey === may1Key,
      )?.label;
      expect(apr30Label).toBe("Thu");
      expect(may1Label).toBe("Fri");
      expect(series[6]?.label).toBe("Today");
    } finally {
      jest.useRealTimers();
    }
  });

  it("shows 30 buckets for 30d and excludes sessions outside rolling range", () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date(2026, 4, 6, 12, 0, 0, 0));

      const inside = buildSession({
        id: "inside",
        startAt: new Date(2026, 3, 20, 10, 0, 0, 0).toISOString(),
        endAt: new Date(2026, 3, 20, 11, 0, 0, 0).toISOString(),
        durationMs: 45 * 60 * 1000,
      });
      const outside = buildSession({
        id: "outside",
        startAt: new Date(2026, 3, 6, 10, 0, 0, 0).toISOString(),
        endAt: new Date(2026, 3, 6, 11, 0, 0, 0).toISOString(),
        durationMs: 60 * 60 * 1000,
      });

      const series = computeRoleTimeSeries([inside, outside], "30d");
      const insideKey = getLocalDayKey(inside.startAt);
      const outsideKey = getLocalDayKey(outside.startAt);

      expect(series).toHaveLength(30);
      expect(series.find((entry) => entry.dateKey === insideKey)?.totalMs).toBe(
        45 * 60 * 1000,
      );
      expect(
        series.find((entry) => entry.dateKey === outsideKey),
      ).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});
