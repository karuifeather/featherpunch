import {
  buildCompletedLogsQueryOptions,
  buildLogsQueryBounds,
  buildSelectedRoleSummaryQueryOptions,
  clampDayToMonth,
  deriveLogsEmptyState,
  getDaysInMonth,
  getCustomRangeDisplayLabel,
  getLogsRangeSummaryText,
  groupSessionLogsByLocalDay,
  isValidCustomDateRange,
} from "@/utils/sessionLogs";
import {
  getRollingRange,
  getRollingRangeQueryBounds,
} from "@/utils/dateRanges";
import type { SessionLogEntry } from "@/types";

function buildEntry(overrides: Partial<SessionLogEntry>): SessionLogEntry {
  return {
    id: "s-1",
    roleId: "r-1",
    roleName: "Studying",
    roleColor: "#3b82f6",
    roleIcon: "book-open",
    startAt: "2026-05-06T17:00:00.000Z",
    endAt: "2026-05-06T18:00:00.000Z",
    durationMs: 60 * 60 * 1000,
    notes: null,
    ...overrides,
  };
}

describe("groupSessionLogsByLocalDay", () => {
  it("groups by local start day and sorts newest-first", () => {
    const entries: SessionLogEntry[] = [
      buildEntry({
        id: "a",
        startAt: "2026-05-05T10:00:00.000Z",
        endAt: "2026-05-05T11:00:00.000Z",
      }),
      buildEntry({
        id: "b",
        startAt: "2026-05-06T10:00:00.000Z",
        endAt: "2026-05-06T11:00:00.000Z",
      }),
      buildEntry({
        id: "c",
        startAt: "2026-05-06T07:00:00.000Z",
        endAt: "2026-05-06T08:00:00.000Z",
      }),
    ];

    const grouped = groupSessionLogsByLocalDay(entries);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].entries.map((entry) => entry.id)).toEqual(["b", "c"]);
    expect(grouped[1].entries.map((entry) => entry.id)).toEqual(["a"]);
  });

  it("keeps a cross-midnight session on its local start day", () => {
    const entry = buildEntry({
      id: "overnight",
      startAt: "2026-05-06T23:50:00.000Z",
      endAt: "2026-05-07T00:30:00.000Z",
    });

    const grouped = groupSessionLogsByLocalDay([entry]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].entries[0].id).toBe("overnight");
  });
});

describe("deriveLogsEmptyState", () => {
  it("returns no-logs-ever copy for non-all range", () => {
    expect(
      deriveLogsEmptyState({
        totalCompletedCount: 0,
        filteredCount: 0,
        selectedRange: "last30Days",
        selectedRangeLabel: "Last 30 days",
      }),
    ).toEqual({
      title: "No completed logs yet",
      body: "Punch into a role and clock out to create your first log.",
    });
  });

  it("returns selected-range copy when role is not filtered", () => {
    expect(
      deriveLogsEmptyState({
        totalCompletedCount: 8,
        filteredCount: 0,
        selectedRange: "last7Days",
        selectedRangeLabel: "Last 7 days",
      }),
    ).toEqual({
      title: "No logs in the last 7 days",
      body: "Try Last 30 days, Custom, or All.",
    });
  });

  it("returns role-and-range copy when role is selected", () => {
    expect(
      deriveLogsEmptyState({
        totalCompletedCount: 8,
        filteredCount: 0,
        selectedRange: "last30Days",
        selectedRangeLabel: "Last 30 days",
        selectedRoleName: "Sushi Boxes",
      }),
    ).toEqual({
      title: "No logs for Sushi Boxes in the last 30 days",
      body: "Try Custom, All, or choose another role.",
    });
  });

  it("returns custom-range copy when role is not selected", () => {
    expect(
      deriveLogsEmptyState({
        totalCompletedCount: 8,
        filteredCount: 0,
        selectedRange: "custom",
        selectedRangeLabel: "Custom",
        customRangeLabel: "Apr 12 - Apr 23",
      }),
    ).toEqual({
      title: "No logs from Apr 12 - Apr 23",
      body: "Try a wider range or All.",
    });
  });

  it("returns custom-range role copy when role is selected", () => {
    expect(
      deriveLogsEmptyState({
        totalCompletedCount: 8,
        filteredCount: 0,
        selectedRange: "custom",
        selectedRangeLabel: "Custom",
        customRangeLabel: "Apr 12 - Apr 23",
        selectedRoleName: "Sushi Boxes",
      }),
    ).toEqual({
      title: "No logs for Sushi Boxes from Apr 12 - Apr 23",
      body: "Try a wider range, All, or choose another role.",
    });
  });
});

describe("logs range helpers", () => {
  it("builds last 7 days bounds using rolling helper", () => {
    const range = getRollingRange("last7Days");
    const expected = getRollingRangeQueryBounds(range);
    const bounds = buildLogsQueryBounds({
      selectedRange: "last7Days",
    });
    expect(bounds).toEqual(expected);
  });

  it("builds last 30 days bounds using rolling helper", () => {
    const range = getRollingRange("last30Days");
    const expected = getRollingRangeQueryBounds(range);
    const bounds = buildLogsQueryBounds({
      selectedRange: "last30Days",
    });
    expect(bounds).toEqual(expected);
  });

  it("builds local-day inclusive bounds for custom range", () => {
    const bounds = buildLogsQueryBounds({
      selectedRange: "custom",
      customRange: {
        startDate: "2026-04-12T13:00:00.000Z",
        endDate: "2026-04-23T08:00:00.000Z",
      },
    });

    const start = new Date(bounds.startIso!);
    const endExclusive = new Date(bounds.endExclusiveIso!);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(endExclusive.getHours()).toBe(0);
    expect(endExclusive.getMinutes()).toBe(0);
    expect(endExclusive.getTime()).toBeGreaterThan(start.getTime());
  });

  it("returns no bounds for all range", () => {
    expect(
      buildLogsQueryBounds({
        selectedRange: "all",
      }),
    ).toEqual({});
  });

  it("formats custom range and all-range summary text", () => {
    expect(
      getLogsRangeSummaryText({
        selectedRange: "custom",
        customRange: {
          startDate: "2026-04-12T13:00:00.000Z",
          endDate: "2026-04-23T08:00:00.000Z",
        },
        listLimit: 100,
      }),
    ).toBe(
      `Custom · ${getCustomRangeDisplayLabel({
        startDate: "2026-04-12T13:00:00.000Z",
        endDate: "2026-04-23T08:00:00.000Z",
      })}`,
    );

    expect(
      getLogsRangeSummaryText({
        selectedRange: "all",
        listLimit: 100,
      }),
    ).toBe("Showing latest 100 completed logs");
  });

  it("rejects invalid custom range when end is before start", () => {
    expect(
      isValidCustomDateRange({
        startDate: "2026-04-23T08:00:00.000Z",
        endDate: "2026-04-12T13:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("builds selected-role custom summary query options", () => {
    const options = buildSelectedRoleSummaryQueryOptions({
      roleId: "role-123",
      selectedRange: "custom",
      customRange: {
        startDate: "2026-03-01T12:00:00.000Z",
        endDate: "2026-03-31T12:00:00.000Z",
      },
    });

    expect(options.roleId).toBe("role-123");
    expect(options.startIso).toBeDefined();
    expect(options.endExclusiveIso).toBeDefined();
    expect(new Date(options.endExclusiveIso!).getTime()).toBeGreaterThan(
      new Date(options.startIso!).getTime(),
    );
  });

  it("includes roleId for selected-role export query options", () => {
    const options = buildCompletedLogsQueryOptions({
      selectedRange: "last30Days",
      roleId: "role-7",
    });
    expect(options.roleId).toBe("role-7");
    expect(options.startIso).toBeDefined();
    expect(options.endExclusiveIso).toBeDefined();
  });

  it("omits roleId for all-roles export query options", () => {
    const options = buildCompletedLogsQueryOptions({
      selectedRange: "all",
    });
    expect(options.roleId).toBeUndefined();
    expect(options.startIso).toBeUndefined();
    expect(options.endExclusiveIso).toBeUndefined();
  });

  it("returns February day count based on selected year", () => {
    expect(getDaysInMonth(2024, 1)).toBe(29);
    expect(getDaysInMonth(2025, 1)).toBe(28);
  });

  it("clamps day when switching to shorter month", () => {
    expect(clampDayToMonth(2026, 3, 31)).toBe(30); // April
    expect(clampDayToMonth(2026, 2, 31)).toBe(31); // March
  });
});
