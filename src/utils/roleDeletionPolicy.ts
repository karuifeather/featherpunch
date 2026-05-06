import type { Role, RoleDeletionSafety } from "@/types";
import { formatDurationShort } from "@/utils/formatTime";

export type RoleActionPolicy = {
  canArchive: boolean;
  canDeletePermanently: boolean;
  archiveLabel: string;
  historySummary: string | null;
  guidanceMessage: string | null;
  deleteDialogTitle: string;
  deleteDialogMessage: string;
  deleteConfirmLabel: string;
};

export function getRoleActionPolicy(
  role: Role,
  safety: RoleDeletionSafety,
): RoleActionPolicy {
  if (safety.isActiveRole) {
    return {
      canArchive: false,
      canDeletePermanently: false,
      archiveLabel: role.isArchived ? "Restore role" : "Archive role",
      historySummary: null,
      guidanceMessage:
        "This role is currently active.\nPunch out or switch roles before archiving or deleting it.",
      deleteDialogTitle: "Role is active",
      deleteDialogMessage:
        "This role is currently active.\nPunch out or switch roles before archiving or deleting it.",
      deleteConfirmLabel: "OK",
    };
  }

  if (safety.totalSessionCount > 0) {
    const logsLabel = safety.completedSessionCount === 1 ? "log" : "logs";
    return {
      canArchive: true,
      canDeletePermanently: false,
      archiveLabel: role.isArchived ? "Restore role" : "Archive role",
      historySummary: `This role has ${safety.completedSessionCount} ${logsLabel} and ${formatDurationShort(
        safety.lifetimeDurationMs,
      )} of tracked time.`,
      guidanceMessage:
        "Permanent delete is disabled to protect your history.\nArchive keeps all logs and removes this role from active use.",
      deleteDialogTitle: "Permanent delete disabled",
      deleteDialogMessage:
        "This role has history and cannot be permanently deleted.\nArchive it to keep your logs.",
      deleteConfirmLabel: "OK",
    };
  }

  return {
    canArchive: true,
    canDeletePermanently: true,
    archiveLabel: role.isArchived ? "Restore role" : "Archive role",
    historySummary: null,
    guidanceMessage:
      "Archive keeps all logs and removes this role from active use.",
    deleteDialogTitle: "Delete role permanently?",
    deleteDialogMessage:
      "This role has no logs yet. Deleting it cannot be undone.",
    deleteConfirmLabel: "Delete permanently",
  };
}
