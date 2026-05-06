import { create } from "zustand";

/** roleEditor: open when non-null. id undefined = new role, id string = edit that role. */
interface ModalStore {
  roleEditor: { id?: string } | null;
  sessionEditorId: string | null;

  openRoleEditor: (id?: string) => void;
  closeRoleEditor: () => void;
  openSessionEditor: (sessionId: string) => void;
  closeSessionEditor: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  roleEditor: null,
  sessionEditorId: null,

  openRoleEditor: (id) => set({ roleEditor: { id } }),
  closeRoleEditor: () => set({ roleEditor: null }),
  openSessionEditor: (sessionId) => set({ sessionEditorId: sessionId }),
  closeSessionEditor: () => set({ sessionEditorId: null }),
}));
