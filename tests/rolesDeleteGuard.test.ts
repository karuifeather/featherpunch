import {
  deleteRole,
  getRoleDeletionSafety,
  RoleDeleteBlockedError,
} from "@/db/roles";
import { getDb } from "@/db/database";

jest.mock("@/db/database", () => ({
  getDb: jest.fn(),
}));

describe("roles delete guard", () => {
  it("deletes role when role has zero sessions", async () => {
    const runAsync = jest.fn();
    (getDb as jest.Mock).mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({ c: 0 }),
      runAsync,
    });

    await deleteRole("role-1");

    expect(runAsync).toHaveBeenCalledTimes(1);
    expect(runAsync).toHaveBeenCalledWith("DELETE FROM roles WHERE id = ?", [
      "role-1",
    ]);
  });

  it("rejects deletion for roles with completed sessions and keeps history", async () => {
    const runAsync = jest.fn();
    (getDb as jest.Mock).mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({ c: 2 }),
      runAsync,
    });

    await expect(deleteRole("role-1")).rejects.toBeInstanceOf(
      RoleDeleteBlockedError,
    );
    expect(runAsync).not.toHaveBeenCalled();
  });

  it("rejects deletion for roles with open sessions and keeps history", async () => {
    const runAsync = jest.fn();
    (getDb as jest.Mock).mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({ c: 1 }),
      runAsync,
    });

    await expect(deleteRole("role-1")).rejects.toBeInstanceOf(
      RoleDeleteBlockedError,
    );
    expect(runAsync).not.toHaveBeenCalled();
  });

  it("builds safety summary counts and duration", async () => {
    (getDb as jest.Mock).mockResolvedValue({
      getFirstAsync: jest.fn().mockResolvedValue({
        completed_session_count: 2,
        open_session_count: 1,
        lifetime_duration_ms: 5400000,
        last_session_at: "2026-05-06T12:00:00.000Z",
        is_active_role: 1,
      }),
    });

    const safety = await getRoleDeletionSafety("role-1");
    expect(safety.completedSessionCount).toBe(2);
    expect(safety.openSessionCount).toBe(1);
    expect(safety.totalSessionCount).toBe(3);
    expect(safety.lifetimeDurationMs).toBe(5400000);
    expect(safety.lastSessionAt).toBe("2026-05-06T12:00:00.000Z");
    expect(safety.canDeletePermanently).toBe(false);
  });
});
