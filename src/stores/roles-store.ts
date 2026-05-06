import { create } from "zustand";

/**
 * Version counter for roles data. Bump after create/update/delete/archive
 * so all useRoles consumers refetch and the UI updates immediately.
 */
interface RolesStore {
  rolesVersion: number;
  bumpRolesVersion: () => void;
}

export const useRolesStore = create<RolesStore>((set) => ({
  rolesVersion: 0,
  bumpRolesVersion: () => set((s) => ({ rolesVersion: s.rolesVersion + 1 })),
}));
