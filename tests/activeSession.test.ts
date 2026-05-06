import {
  deriveHomeTodaySummary,
  getActiveElapsedMs,
  resolveLastEngagedRole,
} from "@/utils/activeSession";
import type { Role, SessionWithRole } from "@/types";

function buildSession(overrides: Partial<SessionWithRole>): SessionWithRole {
  return {
    id: "session-1",
    roleId: "role-1",
    startAt: "2026-05-06T10:00:00.000Z",
    endAt: "2026-05-06T11:00:00.000Z",
    durationMs: 60 * 60 * 1000,
    source: "manual",
    notes: null,
    createdAt: "2026-05-06T10:00:00.000Z",
    updatedAt: "2026-05-06T11:00:00.000Z",
    roleName: "Studying",
    roleColor: "#ffffff",
    roleIcon: "book",
    roleTag: "me",
    roleHourlyRate: null,
    ...overrides,
  };
}

function buildRole(overrides: Partial<Role>): Role {
  return {
    id: "role-1",
    name: "Studying",
    color: "#ffffff",
    icon: "book",
    tag: "me",
    hourlyRate: null,
    isArchived: false,
    sortOrder: 0,
    createdAt: "2026-05-06T10:00:00.000Z",
    updatedAt: "2026-05-06T10:00:00.000Z",
    ...overrides,
  };
}

describe("activeSession helpers", () => {
  it("formats active elapsed-time milliseconds safely", () => {
    expect(
      getActiveElapsedMs(
        "2026-05-06T10:00:00.000Z",
        Date.parse("2026-05-06T10:18:00.000Z"),
      ),
    ).toBe(18 * 60 * 1000);
    expect(
      getActiveElapsedMs(
        "2026-05-06T10:00:00.000Z",
        Date.parse("2026-05-06T09:59:00.000Z"),
      ),
    ).toBe(0);
  });

  it("derives summary for no sessions", () => {
    const summary = deriveHomeTodaySummary(
      [],
      null,
      Date.parse("2026-05-06T12:00:00.000Z"),
    );
    expect(summary).toEqual({
      completedMs: 0,
      activeMs: 0,
      completedPunchIns: 0,
      activePunchIns: 0,
      mostTimeToday: null,
    });
  });

  it("derives summary for completed sessions only", () => {
    const summary = deriveHomeTodaySummary(
      [
        buildSession({ durationMs: 20 * 60 * 1000 }),
        buildSession({ id: "session-2", durationMs: 40 * 60 * 1000 }),
      ],
      null,
      Date.parse("2026-05-06T12:00:00.000Z"),
    );
    expect(summary.completedMs).toBe(60 * 60 * 1000);
    expect(summary.activeMs).toBe(0);
    expect(summary.completedPunchIns).toBe(2);
    expect(summary.activePunchIns).toBe(0);
    expect(summary.mostTimeToday).toBe("Studying");
  });

  it("derives summary for active session only", () => {
    const summary = deriveHomeTodaySummary(
      [buildSession({ endAt: null, durationMs: null })],
      { roleName: "Studying", startAt: "2026-05-06T11:42:00.000Z" },
      Date.parse("2026-05-06T12:00:00.000Z"),
    );
    expect(summary.completedMs).toBe(0);
    expect(summary.activeMs).toBe(18 * 60 * 1000);
    expect(summary.completedPunchIns).toBe(0);
    expect(summary.activePunchIns).toBe(1);
    expect(summary.mostTimeToday).toBe("Studying");
  });

  it("derives summary for completed and active sessions", () => {
    const summary = deriveHomeTodaySummary(
      [
        buildSession({ durationMs: 2 * 60 * 60 * 1000 }),
        buildSession({ id: "session-2", endAt: null, durationMs: null }),
      ],
      { roleName: "Studying", startAt: "2026-05-06T11:42:00.000Z" },
      Date.parse("2026-05-06T12:00:00.000Z"),
    );
    expect(summary.completedMs).toBe(2 * 60 * 60 * 1000);
    expect(summary.activeMs).toBe(18 * 60 * 1000);
    expect(summary.completedPunchIns).toBe(1);
    expect(summary.activePunchIns).toBe(1);
  });

  it("resolves latest available last-engaged role", () => {
    const role = resolveLastEngagedRole("role-1", [
      buildRole({ id: "role-1" }),
    ]);
    expect(role?.id).toBe("role-1");
  });

  it("ignores archived or missing last-engaged roles", () => {
    expect(
      resolveLastEngagedRole("role-2", [buildRole({ id: "role-1" })]),
    ).toBeNull();
    expect(
      resolveLastEngagedRole("role-1", [
        buildRole({ id: "role-1", isArchived: true }),
      ]),
    ).toBeNull();
  });

  it("returns null when no history exists", () => {
    expect(
      resolveLastEngagedRole(null, [buildRole({ id: "role-1" })]),
    ).toBeNull();
  });
});
