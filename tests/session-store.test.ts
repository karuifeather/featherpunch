import { useSessionStore } from "@/stores/session-store";
import type { SessionWithRole } from "@/types";
import * as sessionsDb from "@/db/sessions";

jest.mock("@/db/sessions", () => ({
  getActiveSession: jest.fn(),
  startSession: jest.fn(),
  endSession: jest.fn(),
  switchSession: jest.fn(),
}));

jest.mock("@/db/settings", () => ({
  setSetting: jest.fn(),
}));

function buildOpenSession(
  overrides: Partial<SessionWithRole> = {},
): SessionWithRole {
  return {
    id: "session-1",
    roleId: "role-studying",
    startAt: "2026-05-06T14:00:00.000Z",
    endAt: null,
    durationMs: null,
    source: "manual",
    notes: null,
    createdAt: "2026-05-06T14:00:00.000Z",
    updatedAt: "2026-05-06T14:00:00.000Z",
    roleName: "Studying",
    roleColor: "#3b82f6",
    roleIcon: "book",
    roleTag: "me",
    roleHourlyRate: null,
    ...overrides,
  };
}

describe("session-store hydration", () => {
  const getActiveSessionMock =
    sessionsDb.getActiveSession as jest.MockedFunction<
      typeof sessionsDb.getActiveSession
    >;
  const startSessionMock = sessionsDb.startSession as jest.MockedFunction<
    typeof sessionsDb.startSession
  >;
  const endSessionMock = sessionsDb.endSession as jest.MockedFunction<
    typeof sessionsDb.endSession
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.setState({
      active: null,
      isHydratingActiveSession: false,
    });
  });

  it("hydrates active session when DB has an open session", async () => {
    getActiveSessionMock.mockResolvedValueOnce(buildOpenSession());

    await useSessionStore.getState().hydrateActiveSessionFromDatabase();

    const state = useSessionStore.getState();
    expect(state.active?.sessionId).toBe("session-1");
    expect(state.active?.roleId).toBe("role-studying");
    expect(state.active?.startAt).toBe("2026-05-06T14:00:00.000Z");
    expect(state.isHydratingActiveSession).toBe(false);
  });

  it("clears active state when DB has no open session", async () => {
    useSessionStore.setState({
      active: {
        sessionId: "stale",
        roleId: "stale-role",
        roleName: "Stale",
        roleColor: "#000000",
        roleIcon: "briefcase",
        roleTag: "me",
        startAt: "2026-05-06T12:00:00.000Z",
        elapsedMs: 1000,
      },
    });
    getActiveSessionMock.mockResolvedValueOnce(null);

    await useSessionStore.getState().hydrateActiveSessionFromDatabase();

    expect(useSessionStore.getState().active).toBeNull();
    expect(useSessionStore.getState().isHydratingActiveSession).toBe(false);
  });

  it("does not create a session during hydration", async () => {
    getActiveSessionMock.mockResolvedValueOnce(buildOpenSession());

    await useSessionStore.getState().hydrateActiveSessionFromDatabase();

    expect(startSessionMock).not.toHaveBeenCalled();
  });

  it("can hydrate multiple times safely", async () => {
    getActiveSessionMock
      .mockResolvedValueOnce(buildOpenSession())
      .mockResolvedValueOnce(buildOpenSession({ id: "session-2" }));

    await useSessionStore.getState().hydrateActiveSessionFromDatabase();
    await useSessionStore.getState().hydrateActiveSessionFromDatabase();

    expect(getActiveSessionMock).toHaveBeenCalledTimes(2);
    expect(useSessionStore.getState().active?.sessionId).toBe("session-2");
  });

  it("punch out after hydration closes the hydrated session", async () => {
    getActiveSessionMock.mockResolvedValueOnce(
      buildOpenSession({ id: "session-close-me" }),
    );

    await useSessionStore.getState().hydrateActiveSessionFromDatabase();
    await useSessionStore.getState().clockOut();

    expect(endSessionMock).toHaveBeenCalledWith("session-close-me");
    expect(useSessionStore.getState().active).toBeNull();
  });
});
