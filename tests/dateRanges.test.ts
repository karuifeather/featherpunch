import {
  getRollingRange,
  getRollingRangeQueryBounds,
} from "@/utils/dateRanges";

describe("getRollingRange", () => {
  const fixedNow = new Date(2026, 4, 6, 13, 45, 10, 125);

  it("builds Last 7 days including today and previous 6 days", () => {
    const range = getRollingRange("last7Days", fixedNow);

    expect(range.days).toBe(7);
    expect(range.label).toBe("Last 7 days");
    expect(range.shortLabel).toBe("7 days");
    expect(range.start.getFullYear()).toBe(2026);
    expect(range.start.getMonth()).toBe(3);
    expect(range.start.getDate()).toBe(30);
    expect(range.end.getFullYear()).toBe(2026);
    expect(range.end.getMonth()).toBe(4);
    expect(range.end.getDate()).toBe(6);
  });

  it("builds Last 30 days including today and previous 29 days", () => {
    const range = getRollingRange("last30Days", fixedNow);

    expect(range.days).toBe(30);
    expect(range.label).toBe("Last 30 days");
    expect(range.shortLabel).toBe("30 days");
    expect(range.start.getFullYear()).toBe(2026);
    expect(range.start.getMonth()).toBe(3);
    expect(range.start.getDate()).toBe(7);
    expect(range.end.getDate()).toBe(6);
  });

  it("builds Last 90 days including today and previous 89 days", () => {
    const range = getRollingRange("last90Days", fixedNow);

    expect(range.days).toBe(90);
    expect(range.label).toBe("Last 90 days");
    expect(range.shortLabel).toBe("90 days");
    expect(range.start.getFullYear()).toBe(2026);
    expect(range.start.getMonth()).toBe(1);
    expect(range.start.getDate()).toBe(6);
    expect(range.end.getMonth()).toBe(4);
    expect(range.end.getDate()).toBe(6);
  });

  it("returns stable display range for fixed date", () => {
    const range = getRollingRange("last30Days", fixedNow);
    expect(range.displayRange).toBe("Apr 7 - May 6");
  });

  it("uses local-day boundaries for start and end", () => {
    const range = getRollingRange("last7Days", fixedNow);

    expect(range.start.getHours()).toBe(0);
    expect(range.start.getMinutes()).toBe(0);
    expect(range.start.getSeconds()).toBe(0);
    expect(range.start.getMilliseconds()).toBe(0);

    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMinutes()).toBe(59);
    expect(range.end.getSeconds()).toBe(59);
    expect(range.end.getMilliseconds()).toBe(999);
  });

  it("uses next local midnight as query end exclusive", () => {
    const range = getRollingRange("last7Days", fixedNow);
    const bounds = getRollingRangeQueryBounds(range);
    const endExclusive = new Date(bounds.endExclusiveIso);

    expect(endExclusive.getFullYear()).toBe(2026);
    expect(endExclusive.getMonth()).toBe(4);
    expect(endExclusive.getDate()).toBe(7);
    expect(endExclusive.getHours()).toBe(0);
    expect(endExclusive.getMinutes()).toBe(0);
    expect(endExclusive.getSeconds()).toBe(0);
    expect(endExclusive.getMilliseconds()).toBe(0);
  });

  it("includes prior-year days for Last 7 days near Jan 2", () => {
    const jan2 = new Date(2026, 0, 2, 10, 0, 0, 0);
    const range = getRollingRange("last7Days", jan2);

    expect(range.start.getFullYear()).toBe(2025);
    expect(range.start.getMonth()).toBe(11);
    expect(range.start.getDate()).toBe(27);
    expect(range.end.getFullYear()).toBe(2026);
    expect(range.end.getMonth()).toBe(0);
    expect(range.end.getDate()).toBe(2);
  });

  it("includes prior-year days for Last 30 days near Jan 2", () => {
    const jan2 = new Date(2026, 0, 2, 10, 0, 0, 0);
    const range = getRollingRange("last30Days", jan2);

    expect(range.start.getFullYear()).toBe(2025);
    expect(range.start.getMonth()).toBe(11);
    expect(range.start.getDate()).toBe(4);
    expect(range.end.getFullYear()).toBe(2026);
    expect(range.end.getMonth()).toBe(0);
    expect(range.end.getDate()).toBe(2);
  });
});
