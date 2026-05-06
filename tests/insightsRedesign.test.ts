import {
  computeAnalytics,
  formatComparisonDurationCopy,
  getPreviousRollingRange,
} from "@/services/analytics";
import { getRollingRange } from "@/utils/dateRanges";
import {
  buildRoleComparisonRows,
  deriveInsightsEmptyState,
  deriveKeyTakeaway,
  derivePatternInsights,
  deriveEarningsInsight,
  deriveChangeExplanation,
  formatInsightsRangeLabel,
  getTotalComparisonCopy,
  getSessionComparisonCopy,
} from "@/utils/insightsPresentation";
import type { SessionWithRole } from "@/types";

function buildSession(overrides: Partial<SessionWithRole>): SessionWithRole {
  return {
    id: "s-1",
    roleId: "r-1",
    startAt: "2026-05-06T14:00:00.000Z",
    endAt: "2026-05-06T15:00:00.000Z",
    durationMs: 60 * 60 * 1000,
    source: "manual",
    notes: null,
    createdAt: "2026-05-06T14:00:00.000Z",
    updatedAt: "2026-05-06T15:00:00.000Z",
    roleName: "Sushi Boxes",
    roleColor: "#ff8800",
    roleIcon: "utensils",
    roleTag: "other",
    roleHourlyRate: 12,
    ...overrides,
  };
}

describe("insights redesign helpers", () => {
  it("formats selected rolling range label", () => {
    const range = getRollingRange("last7Days", new Date(2026, 4, 6, 12, 0, 0));
    expect(formatInsightsRangeLabel(range)).toContain("Last 7 days");
    expect(formatInsightsRangeLabel(range)).toContain("·");
  });

  it("builds previous-period bounds with same day count", () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date(2026, 4, 6, 12, 0, 0));
      const previous7 = getPreviousRollingRange("7d");
      const start = new Date(previous7.startIso).getTime();
      const end = new Date(previous7.endExclusiveIso).getTime();
      expect((end - start) / (24 * 60 * 60 * 1000)).toBe(7);
    } finally {
      jest.useRealTimers();
    }
  });

  it("computes totals from completed sessions only", () => {
    const completedA = buildSession({ id: "a", durationMs: 30 * 60 * 1000 });
    const completedB = buildSession({
      id: "b",
      durationMs: 90 * 60 * 1000,
      roleId: "r-2",
      roleName: "Sleep",
      roleTag: "me",
    });
    const open = buildSession({
      id: "open",
      endAt: null,
      durationMs: null,
      roleName: "Open Shift",
    });
    const analytics = computeAnalytics([completedA, completedB, open]);
    expect(analytics.totalMs).toBe(120 * 60 * 1000);
    expect(analytics.sessionCount).toBe(2);
    expect(analytics.avgSessionMs).toBe(60 * 60 * 1000);
    expect(analytics.longestSessionMs).toBe(90 * 60 * 1000);
  });

  it("tracks top role by duration and role totals", () => {
    const sessions = [
      buildSession({ id: "a", durationMs: 30 * 60 * 1000 }),
      buildSession({
        id: "b",
        durationMs: 90 * 60 * 1000,
        roleId: "r-2",
        roleName: "Client Work",
      }),
      buildSession({
        id: "c",
        durationMs: 60 * 60 * 1000,
        roleId: "r-2",
        roleName: "Client Work",
      }),
    ];
    const analytics = computeAnalytics(sessions);
    expect(analytics.topRoleByDuration?.roleName).toBe("Client Work");
    expect(analytics.roleStats.reduce((sum, r) => sum + r.totalMs, 0)).toBe(
      analytics.totalMs,
    );
  });

  it("derives empty-state copy when selected range has no sessions but history exists", () => {
    const emptyState = deriveInsightsEmptyState({
      selectedRangeLabel: "Last 7 days",
      selectedCompletedCount: 0,
      totalCompletedCount: 10,
      lastCompleted: {
        roleName: "Sushi Boxes",
        startAt: "2026-04-23T10:00:00.000Z",
      },
    });
    expect(emptyState.title).toContain("No completed sessions");
    expect(emptyState.body).toContain("Last tracked Sushi Boxes");
  });

  it("formats increase/decrease/no-previous comparison copy", () => {
    expect(formatComparisonDurationCopy(2 * 60 * 60 * 1000, 0, "7 days")).toBe(
      "New activity this period",
    );
    expect(
      formatComparisonDurationCopy(
        60 * 60 * 1000,
        2 * 60 * 60 * 1000,
        "7 days",
      ),
    ).toContain("-1h");
    expect(getSessionComparisonCopy(1, 4, "7 days")).toContain(
      "fewer sessions",
    );
  });

  it("returns about-the-same copy under duration threshold", () => {
    expect(
      getTotalComparisonCopy(
        60 * 60 * 1000,
        60 * 60 * 1000 + 2 * 60 * 1000,
        "30 days",
      ),
    ).toContain("About the same");
  });

  it("creates key takeaway for increased time", () => {
    const takeaway = deriveKeyTakeaway({
      currentTotalMs: 4 * 60 * 60 * 1000,
      previousTotalMs: 2 * 60 * 60 * 1000,
      currentSessionCount: 4,
      currentTopRole: null,
      currentRangeLabel: "Last 30 days",
      currentRangeShortLabel: "30 days",
      lastCompleted: null,
    });
    expect(takeaway.title).toContain("tracked");
  });

  it("creates key takeaway for no current data", () => {
    const takeaway = deriveKeyTakeaway({
      currentTotalMs: 0,
      previousTotalMs: 2 * 60 * 60 * 1000,
      currentSessionCount: 0,
      currentTopRole: null,
      currentRangeLabel: "Last 7 days",
      currentRangeShortLabel: "7 days",
      lastCompleted: {
        roleName: "Sushi Boxes",
        startAt: "2026-04-23T10:00:00.000Z",
      },
    });
    expect(takeaway.title).toContain("No completed sessions");
  });

  it("creates key takeaway for new activity", () => {
    const takeaway = deriveKeyTakeaway({
      currentTotalMs: 60 * 60 * 1000,
      previousTotalMs: 0,
      currentSessionCount: 2,
      currentTopRole: null,
      currentRangeLabel: "Last 30 days",
      currentRangeShortLabel: "30 days",
      lastCompleted: null,
    });
    expect(takeaway.title).toBe("New activity this period.");
  });

  it("creates dominant-role takeaway when one role dominates", () => {
    const currentTopRole = computeAnalytics([
      buildSession({ durationMs: 180 * 60 * 1000, roleName: "Sushi Boxes" }),
      buildSession({
        durationMs: 10 * 60 * 1000,
        roleName: "Other Work",
        roleId: "r-2",
      }),
    ]).topRoleByDuration;
    const takeaway = deriveKeyTakeaway({
      currentTotalMs: 190 * 60 * 1000,
      previousTotalMs: 180 * 60 * 1000,
      currentSessionCount: 3,
      currentTopRole,
      currentRangeLabel: "Last 30 days",
      currentRangeShortLabel: "30 days",
      lastCompleted: null,
    });
    expect(takeaway.title).toContain("dominated");
  });

  it("explains change from role contribution when dominant", () => {
    const current = computeAnalytics([
      buildSession({ durationMs: 4 * 60 * 60 * 1000, roleName: "Sushi Boxes" }),
    ]);
    const previous = computeAnalytics([
      buildSession({ durationMs: 1 * 60 * 60 * 1000, roleName: "Sushi Boxes" }),
    ]);
    const explanation = deriveChangeExplanation({
      currentTotalMs: current.totalMs,
      previousTotalMs: previous.totalMs,
      currentSessionCount: current.sessionCount,
      previousSessionCount: previous.sessionCount,
      currentAvgSessionMs: current.avgSessionMs,
      previousAvgSessionMs: previous.avgSessionMs,
      currentRoleStats: current.roleStats,
      previousRoleStats: previous.roleStats,
      rangeShortLabel: "30 days",
    });
    expect(explanation.label).toContain("driver");
  });

  it("explains change from session count when role delta not dominant", () => {
    const current = computeAnalytics([
      buildSession({ id: "a", durationMs: 90 * 60 * 1000 }),
      buildSession({ id: "a2", durationMs: 90 * 60 * 1000 }),
      buildSession({
        id: "b",
        durationMs: 90 * 60 * 1000,
        roleId: "r-2",
        roleName: "Building",
      }),
      buildSession({
        id: "b2",
        durationMs: 90 * 60 * 1000,
        roleId: "r-2",
        roleName: "Building",
      }),
      buildSession({
        id: "c",
        durationMs: 90 * 60 * 1000,
        roleId: "r-3",
        roleName: "Sleep",
      }),
      buildSession({
        id: "c2",
        durationMs: 90 * 60 * 1000,
        roleId: "r-3",
        roleName: "Sleep",
      }),
    ]);
    const previous = computeAnalytics([
      buildSession({ id: "p1", durationMs: 120 * 60 * 1000 }),
      buildSession({
        id: "p2",
        durationMs: 120 * 60 * 1000,
        roleId: "r-2",
        roleName: "Building",
      }),
      buildSession({
        id: "p3",
        durationMs: 120 * 60 * 1000,
        roleId: "r-3",
        roleName: "Sleep",
      }),
    ]);
    const explanation = deriveChangeExplanation({
      currentTotalMs: current.totalMs,
      previousTotalMs: previous.totalMs,
      currentSessionCount: current.sessionCount,
      previousSessionCount: previous.sessionCount,
      currentAvgSessionMs: current.avgSessionMs,
      previousAvgSessionMs: previous.avgSessionMs,
      currentRoleStats: current.roleStats,
      previousRoleStats: previous.roleStats,
      rangeShortLabel: "30 days",
    });
    expect(explanation.detail).toContain("completed sessions");
  });

  it("builds role deltas and hides tiny delta noise", () => {
    const current = computeAnalytics([
      buildSession({ durationMs: 60 * 60 * 1000, roleName: "Sushi Boxes" }),
    ]);
    const previous = computeAnalytics([
      buildSession({
        durationMs: 58 * 60 * 1000,
        roleName: "Sushi Boxes",
      }),
    ]);
    const rows = buildRoleComparisonRows({
      currentRoleStats: current.roleStats,
      previousRoleStats: previous.roleStats,
      totalCurrentMs: current.totalMs,
      totalPreviousMs: previous.totalMs,
      rangeShortLabel: "7 days",
    });
    expect(rows[0]?.deltaCopy).toContain("About the same");
  });

  it("derives most active day, start window, and active day count", () => {
    const sessions = [
      buildSession({
        startAt: "2026-05-05T18:00:00.000Z",
        durationMs: 60 * 60 * 1000,
      }),
      buildSession({
        startAt: "2026-05-05T18:30:00.000Z",
        durationMs: 30 * 60 * 1000,
      }),
      buildSession({
        startAt: "2026-05-06T18:10:00.000Z",
        durationMs: 20 * 60 * 1000,
      }),
    ];
    const patterns = derivePatternInsights(sessions);
    expect(patterns.activeDays).toBeGreaterThanOrEqual(1);
    expect(patterns.mostActiveDay).not.toBeNull();
    expect(["Morning", "Afternoon", "Evening", "Night"]).toContain(
      patterns.startWindowLabel,
    );
  });

  it("derives earnings with total and top paid role", () => {
    const sessions = [
      buildSession({
        durationMs: 60 * 60 * 1000,
        roleHourlyRate: 20,
        roleName: "Sushi Boxes",
      }),
      buildSession({
        id: "b",
        roleId: "r-2",
        roleName: "Building",
        durationMs: 30 * 60 * 1000,
        roleHourlyRate: 30,
      }),
    ];
    const earnings = deriveEarningsInsight(sessions);
    expect(earnings).not.toBeNull();
    expect(earnings?.totalEstimatedCents).toBeGreaterThan(0);
    expect(earnings?.topPaidRole?.name).toBe("Sushi Boxes");
  });

  it("hides earnings when no paid sessions exist", () => {
    const earnings = deriveEarningsInsight([
      buildSession({ roleHourlyRate: null }),
      buildSession({ id: "b", roleHourlyRate: null }),
    ]);
    expect(earnings).toBeNull();
  });

  it("keeps active sessions excluded from completed totals", () => {
    const analytics = computeAnalytics([
      buildSession({ durationMs: 60 * 60 * 1000 }),
      buildSession({ endAt: null, durationMs: null }),
    ]);
    expect(analytics.sessionCount).toBe(1);
    expect(analytics.totalMs).toBe(60 * 60 * 1000);
  });
});
