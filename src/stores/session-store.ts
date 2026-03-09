import { create } from 'zustand';
import type { ActiveSession, SessionWithRole } from '@/types';
import * as sessionsDb from '@/db/sessions';

interface SessionStore {
  active: ActiveSession | null;
  isLoading: boolean;

  loadActiveSession: () => Promise<void>;
  clockIn: (roleId: string) => Promise<void>;
  clockOut: () => Promise<void>;
  switchRole: (newRoleId: string) => Promise<void>;
  tick: () => void;
  clear: () => void;
}

function sessionWithRoleToActive(s: SessionWithRole): ActiveSession {
  return {
    sessionId: s.id,
    roleId: s.roleId,
    roleName: s.roleName,
    roleColor: s.roleColor,
    roleIcon: s.roleIcon,
    roleTag: s.roleTag,
    startAt: s.startAt,
    elapsedMs: Date.now() - new Date(s.startAt).getTime(),
  };
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  active: null,
  isLoading: true,

  loadActiveSession: async () => {
    set({ isLoading: true });
    const session = await sessionsDb.getActiveSession();
    set({
      active: session ? sessionWithRoleToActive(session) : null,
      isLoading: false,
    });
  },

  clockIn: async (roleId: string) => {
    const { active } = get();
    if (active) {
      await sessionsDb.endSession(active.sessionId);
    }
    await sessionsDb.startSession(roleId);
    const newActive = await sessionsDb.getActiveSession();
    set({
      active: newActive ? sessionWithRoleToActive(newActive) : null,
    });
  },

  clockOut: async () => {
    const { active } = get();
    if (!active) return;
    await sessionsDb.endSession(active.sessionId);
    set({ active: null });
  },

  switchRole: async (newRoleId: string) => {
    const { active } = get();
    if (!active) return;
    await sessionsDb.switchSession(active.sessionId, newRoleId);
    const newActive = await sessionsDb.getActiveSession();
    set({
      active: newActive ? sessionWithRoleToActive(newActive) : null,
    });
  },

  tick: () => {
    const { active } = get();
    if (!active) return;
    set({
      active: {
        ...active,
        elapsedMs: Date.now() - new Date(active.startAt).getTime(),
      },
    });
  },

  clear: () => set({ active: null, isLoading: true }),
}));
