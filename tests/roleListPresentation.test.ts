import type { Role } from "@/types";
import {
  buildRoleListItemModel,
  createEmptyRoleListSummary,
  matchesRoleFilter,
  sortRecentFirst,
} from "@/utils/roleListPresentation";

function buildRole(overrides: Partial<Role>): Role {
  return {
    id: "role-1",
    name: "Studying",
    color: "#5B8CFF",
    icon: "book",
    tag: "me",
    hourlyRate: null,
    isArchived: false,
    sortOrder: 0,
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("roleListPresentation helpers", () => {
  const now = new Date("2026-05-06T17:00:00.000Z");

  it("prioritizes active role subtitle and badge", () => {
    const role = buildRole({ id: "role-active" });
    const model = buildRoleListItemModel(
      role,
      {
        ...createEmptyRoleListSummary(role.id),
        isActive: true,
        activeStartedAt: "2026-05-06T16:31:00.000Z",
      },
      now,
    );
    expect(model.subtitle).toContain("Active now");
    expect(model.rightBadge).toBe("active");
  });

  it("sorts recent roles by most recent completed session", () => {
    const older = buildRoleListItemModel(
      buildRole({ id: "older" }),
      {
        ...createEmptyRoleListSummary("older"),
        lastCompletedSessionAt: "2026-04-01T10:00:00.000Z",
      },
      now,
    );
    const newer = buildRoleListItemModel(
      buildRole({ id: "newer" }),
      {
        ...createEmptyRoleListSummary("newer"),
        lastCompletedSessionAt: "2026-05-01T10:00:00.000Z",
      },
      now,
    );
    expect(sortRecentFirst([older, newer]).map((item) => item.role.id)).toEqual(
      ["newer", "older"],
    );
  });

  it("detects no logs state from lifetime completed sessions", () => {
    const role = buildRole({ id: "role-no-logs" });
    const model = buildRoleListItemModel(
      role,
      createEmptyRoleListSummary(role.id),
      now,
    );
    expect(model.subtitle).toBe("No logs yet");
  });

  it("detects paid roles and computes estimated earnings subtitle", () => {
    const role = buildRole({ id: "paid-role", hourlyRate: 15 });
    const model = buildRoleListItemModel(
      role,
      {
        ...createEmptyRoleListSummary(role.id),
        last30DurationMs: 2 * 60 * 60 * 1000,
        last30CompletedSessions: 2,
      },
      now,
    );
    expect(model.paidSubtitle).toContain("$15/hr");
    expect(model.paidSubtitle).toContain("est. last 30 days");
  });

  it("supports all role filters", () => {
    const role = buildRole({ id: "r-filter", hourlyRate: 20 });
    const summary = {
      ...createEmptyRoleListSummary(role.id),
      last30CompletedSessions: 1,
      lifetimeCompletedSessions: 1,
    };
    expect(matchesRoleFilter(role, summary, "all")).toBe(true);
    expect(matchesRoleFilter(role, summary, "recent")).toBe(true);
    expect(matchesRoleFilter(role, summary, "paid")).toBe(true);
    expect(matchesRoleFilter(role, summary, "noLogs")).toBe(false);
  });
});
