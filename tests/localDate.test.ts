import {
  endOfLocalDay,
  getLocalDayKey,
  startOfLocalDay,
  startOfNextLocalDay,
} from "@/utils/localDate";

function localKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("localDate helpers", () => {
  it("builds day key from local calendar fields", () => {
    const value = new Date("2026-01-02T00:30:00.000Z");
    const localKey = getLocalDayKey(value);
    const utcKey = value.toISOString().split("T")[0];

    expect(localKey).toBe(localKeyFromDate(value));
    if (value.getTimezoneOffset() !== 0) {
      expect(localKey).not.toBe(utcKey);
    }
  });

  it("returns local day boundaries and next local midnight", () => {
    const value = new Date(2026, 4, 6, 13, 45, 10, 123);
    const start = startOfLocalDay(value);
    const end = endOfLocalDay(value);
    const next = startOfNextLocalDay(value);

    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(start.getMilliseconds()).toBe(0);

    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);

    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(4);
    expect(next.getDate()).toBe(7);
    expect(next.getHours()).toBe(0);
    expect(next.getMinutes()).toBe(0);
    expect(next.getSeconds()).toBe(0);
    expect(next.getMilliseconds()).toBe(0);
  });
});
