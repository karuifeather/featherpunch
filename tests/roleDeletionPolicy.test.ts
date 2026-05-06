import type { Role, RoleDeletionSafety } from "@/types";
import { getRoleActionPolicy } from "@/utils/roleDeletionPolicy";

function buildRole(overrides: Partial<Role> = {}): Role {
  return {
    id: "role-1",
    name: "Sushi Boxes",
    color: "#ffffff",
    icon: "briefcase",
    tag: "other",
    hourlyRate: null,
    isArchived: false,
    sortOrder: 0,
    createdAt: "2026-05-06T10:00:00.000Z",
    updatedAt: "2026-05-06T10:00:00.000Z",
    ...overrides,
  };
}

function buildSafety(
  overrides: Partial<RoleDeletionSafety> = {},
): RoleDeletionSafety {
  return {
    roleId: "role-1",
    canDeletePermanently: true,
    completedSessionCount: 0,
    openSessionCount: 0,
    totalSessionCount: 0,
    lifetimeDurationMs: 0,
    lastSessionAt: null,
    isActiveRole: false,
    ...overrides,
  };
}

describe("role deletion policy", () => {
  it("blocks archive and delete when role is active", () => {
    const policy = getRoleActionPolicy(
      buildRole(),
      buildSafety({
        isActiveRole: true,
        canDeletePermanently: false,
        openSessionCount: 1,
        totalSessionCount: 1,
      }),
    );

    expect(policy.canArchive).toBe(false);
    expect(policy.canDeletePermanently).toBe(false);
    expect(policy.guidanceMessage).toContain("Punch out or switch roles");
  });

  it("returns archive-first messaging when role has history", () => {
    const policy = getRoleActionPolicy(
      buildRole(),
      buildSafety({
        canDeletePermanently: false,
        completedSessionCount: 10,
        totalSessionCount: 10,
        lifetimeDurationMs: 19.5 * 60 * 60 * 1000,
      }),
    );

    expect(policy.canDeletePermanently).toBe(false);
    expect(policy.historySummary).toContain("10 logs");
    expect(policy.historySummary).toContain("19h 30m");
    expect(policy.deleteDialogMessage).toContain(
      "cannot be permanently deleted",
    );
  });

  it("allows permanent delete messaging when role has no history", () => {
    const policy = getRoleActionPolicy(buildRole(), buildSafety());

    expect(policy.canDeletePermanently).toBe(true);
    expect(policy.deleteDialogTitle).toBe("Delete role permanently?");
    expect(policy.deleteConfirmLabel).toBe("Delete permanently");
  });
});
