import {
  buildOverviewRows,
  deriveRoleChartState,
  deriveRoleHeaderSubtext,
  hasEnoughDataForTrend,
  getTrendUnavailableCopy,
} from "@/utils/roleDetailPresentation";

describe("deriveRoleHeaderSubtext", () => {
  it("returns selected-range total when range has time", () => {
    const subtext = deriveRoleHeaderSubtext({
      roleName: "Studying",
      period: "7d",
      selectedRangeTotalMs: 7_380_000,
      completedSessionCount: 10,
      lastSessionAt: "2026-05-05T10:00:00.000Z",
    });
    expect(subtext).toBe("2h 3m in last 7 days");
  });

  it("returns last tracked when selected range is empty and older history exists", () => {
    const subtext = deriveRoleHeaderSubtext({
      roleName: "Sleeping",
      period: "30d",
      selectedRangeTotalMs: 0,
      completedSessionCount: 5,
      lastSessionAt: "2026-03-08T10:00:00.000Z",
    });
    expect(subtext).toMatch(/^Last tracked /);
    expect(subtext).toContain("Mar");
  });

  it("returns no logs yet when role has no completed history", () => {
    const subtext = deriveRoleHeaderSubtext({
      roleName: "Sleeping",
      period: "7d",
      selectedRangeTotalMs: 0,
      completedSessionCount: 0,
      lastSessionAt: null,
    });
    expect(subtext).toBe("No logs yet");
  });
});

describe("getTrendUnavailableCopy", () => {
  it("uses activity framing with singular day wording", () => {
    const copy = getTrendUnavailableCopy(1);
    expect(copy.title).toBe("Activity this period");
    expect(copy.body).toContain("1 active day so far");
    expect(copy.body).toContain("unlock trends");
  });

  it("uses plural day wording", () => {
    const copy = getTrendUnavailableCopy(2);
    expect(copy.body).toContain("2 active days so far");
  });
});

describe("deriveRoleChartState", () => {
  it("hides chart when there are no selected-range sessions", () => {
    const state = deriveRoleChartState({
      selectedRangeSessionCount: 0,
      activeDaysInRange: 0,
    });
    expect(state.shouldShowChart).toBe(false);
    expect(state.hasSelectedRangeSessions).toBe(false);
  });

  it("shows chart and trend note when one session/day exists", () => {
    const state = deriveRoleChartState({
      selectedRangeSessionCount: 1,
      activeDaysInRange: 1,
    });
    expect(state.shouldShowChart).toBe(true);
    expect(state.hasEnoughDataForTrend).toBe(false);
    expect(state.trendMessage).toBe("Not enough data for a trend yet");
  });

  it("shows chart with enough trend data at two active days", () => {
    const state = deriveRoleChartState({
      selectedRangeSessionCount: 2,
      activeDaysInRange: 2,
    });
    expect(state.shouldShowChart).toBe(true);
    expect(state.hasEnoughDataForTrend).toBe(true);
  });
});

describe("hasEnoughDataForTrend", () => {
  it("requires at least two active days", () => {
    expect(hasEnoughDataForTrend(1)).toBe(false);
    expect(hasEnoughDataForTrend(2)).toBe(true);
  });
});

describe("buildOverviewRows", () => {
  const baseParams = {
    totalMs: 3_600_000,
    sessionCount: 3,
    avgSessionMs: 1_200_000,
    longestSessionMs: 2_700_000,
    activeDaysInPeriod: 2,
    mostRecentDayActive: "Tue, May 5",
    lifetimeDurationMs: 9_000_000,
    includeEstimatedEarning: null,
    last7Ms: 3_600_000,
    last30Ms: 7_200_000,
  };

  it("does not repeat Last 7 days on 7d tab", () => {
    const rows = buildOverviewRows({ ...baseParams, period: "7d" });
    const labels = rows.map((r) => r.label);
    const activeDaysRow = rows.find((r) => r.label === "Active days");
    expect(labels).not.toContain("Last 7 days");
    expect(labels).toContain("Last 30 days");
    expect(activeDaysRow?.value).toBe("2 days");
  });

  it("does not repeat Last 30 days on 30d tab", () => {
    const rows = buildOverviewRows({ ...baseParams, period: "30d" });
    const labels = rows.map((r) => r.label);
    expect(labels).not.toContain("Last 30 days");
    expect(labels).toContain("Last 7 days");
  });
});
