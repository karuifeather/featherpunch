import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  AppState,
  AppStateStatus,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useEdgeToEdgeInsets } from "@/hooks/useEdgeToEdgeInsets";
import { useRoles } from "@/hooks/useRoles";
import { useSessionStore } from "@/stores/session-store";
import { useModalStore } from "@/stores/modal-store";
import { RoleIcon } from "@/components/role-icon";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RoleActionsModal } from "@/components/role-actions-modal";
import { OverlayHeader } from "@/components/overlay-header";
import { EdgeToEdgeScreen } from "@/components/screen-container";
import { RADIUS, TYPOGRAPHY } from "@/constants/designTokens";
import { ACCENT } from "@/constants/colors";
import {
  updateRole,
  deleteRole,
  getRoleDeletionSafety,
  RoleDeleteBlockedError,
} from "@/db/roles";
import { useRolesStore } from "@/stores/roles-store";
import type { Role, RoleDeletionSafety } from "@/types";
import { getRoleActionPolicy } from "@/utils/roleDeletionPolicy";

const ROW_PADDING_V = 12;
const ROW_PADDING_H = 16;
const ICON_BG_SIZE = 40;

function roleSubtitle(role: Role): string {
  if (role.hourlyRate != null) return `$${role.hourlyRate}/hr`;
  return "Role";
}

export default function RolesScreen() {
  const { hex, bg } = useThemeColors();
  const { tabBarHeight, overlayHeaderHeight } = useEdgeToEdgeInsets();
  const { roles, loading, refresh } = useRoles(true);
  const router = useRouter();
  const { openRoleEditor } = useModalStore();
  const [actionsRole, setActionsRole] = useState<Role | null>(null);
  const [actionsSafety, setActionsSafety] = useState<RoleDeletionSafety | null>(
    null,
  );
  const [confirmRole, setConfirmRole] = useState<{
    role: Role;
    action: "archive" | "delete";
    safety: RoleDeletionSafety;
  } | null>(null);
  const refreshRolesData = useCallback(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refreshRolesData();
  }, [refreshRolesData]);

  useFocusEffect(
    useCallback(() => {
      refreshRolesData();
    }, [refreshRolesData]),
  );

  useEffect(() => {
    let lastAppState = AppState.currentState;
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        const isReturningToForeground =
          lastAppState.match(/inactive|background/) &&
          nextAppState === "active";
        if (isReturningToForeground) {
          refreshRolesData();
        }
        lastAppState = nextAppState;
      },
    );

    return () => subscription.remove();
  }, [refreshRolesData]);

  const activeRoles = roles.filter((r) => !r.isArchived);
  const archivedRoles = roles.filter((r) => r.isArchived);

  const handleArchive = async (role: Role) => {
    const safety = await getRoleDeletionSafety(role.id);
    setConfirmRole({ role, action: "archive", safety });
  };

  const handleDelete = async (role: Role) => {
    const safety = await getRoleDeletionSafety(role.id);
    setConfirmRole({ role, action: "delete", safety });
  };

  const bumpRolesVersion = useRolesStore((s) => s.bumpRolesVersion);

  const onConfirmAction = async () => {
    if (!confirmRole) return;
    const { role, action, safety } = confirmRole;
    setConfirmRole(null);
    const actionPolicy = getRoleActionPolicy(role, safety);

    if (action === "archive" && !actionPolicy.canArchive) return;
    if (action === "delete" && !actionPolicy.canDeletePermanently) return;

    if (action === "archive") {
      await updateRole(role.id, { isArchived: !role.isArchived });
    } else {
      const wasActiveRole =
        useSessionStore.getState().active?.roleId === role.id;
      try {
        await deleteRole(role.id);
      } catch (error) {
        if (!(error instanceof RoleDeleteBlockedError)) {
          throw error;
        }
      }
      if (wasActiveRole) useSessionStore.getState().clear();
    }
    bumpRolesVersion();
  };

  useEffect(() => {
    let cancelled = false;
    if (!actionsRole) {
      setActionsSafety(null);
      return;
    }

    getRoleDeletionSafety(actionsRole.id).then((safety) => {
      if (!cancelled) setActionsSafety(safety);
    });

    return () => {
      cancelled = true;
    };
  }, [actionsRole]);

  const headerSubtitle =
    activeRoles.length === 0 && !loading
      ? "Manage the roles you live"
      : activeRoles.length === 1
        ? "1 role"
        : `${activeRoles.length} roles`;

  const RoleRow = ({
    role,
    isArchived,
    isLast,
  }: {
    role: Role;
    isArchived?: boolean;
    isLast?: boolean;
  }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(root)/role-stats/${role.id}`)}
      activeOpacity={0.7}
      style={[
        styles.row,
        {
          backgroundColor: hex.surface,
          borderBottomColor: hex.border,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
        isArchived && styles.rowArchived,
      ]}
    >
      <RoleIcon
        icon={role.icon}
        color={role.color}
        size={18}
        bgSize={ICON_BG_SIZE}
      />
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: hex.text }]} numberOfLines={1}>
          {role.name}
        </Text>
        <Text
          style={[styles.rowSubtitle, { color: hex.textSecondary }]}
          numberOfLines={1}
        >
          {roleSubtitle(role)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          setActionsRole(role);
        }}
        hitSlop={12}
        style={styles.overflowBtn}
        accessibilityLabel="Role options"
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={20}
          color={hex.textTertiary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <EdgeToEdgeScreen
      style={{ flex: 1 }}
      overlay={
        <OverlayHeader
          title="Roles"
          subtitle={headerSubtitle}
          trailing={
            <TouchableOpacity
              onPress={() => openRoleEditor()}
              hitSlop={8}
              style={styles.headerAction}
              accessibilityLabel="New role"
            >
              <Ionicons name="add" size={18} color={ACCENT.primary} />
              <Text
                style={[styles.headerActionLabel, { color: ACCENT.primary }]}
              >
                New Role
              </Text>
            </TouchableOpacity>
          }
        />
      }
    >
      <ScrollView
        className={bg}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: overlayHeaderHeight + 12,
            paddingBottom: tabBarHeight + 32,
          },
        ]}
      >
        {activeRoles.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: hex.text }]}>
              No roles yet
            </Text>
            <Text style={[styles.emptyMessage, { color: hex.textSecondary }]}>
              Create roles to punch in and see where your time goes.
            </Text>
            <TouchableOpacity
              onPress={() => openRoleEditor()}
              style={[styles.emptyCta, { backgroundColor: ACCENT.primary }]}
              activeOpacity={0.88}
            >
              <Text style={styles.emptyCtaLabel}>Create role</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.listCard,
                { backgroundColor: hex.surface, borderColor: hex.border },
              ]}
            >
              {activeRoles.map((role, index) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  isArchived={false}
                  isLast={index === activeRoles.length - 1}
                />
              ))}
            </View>

            {archivedRoles.length > 0 && (
              <>
                <Text
                  style={[styles.sectionLabel, { color: hex.textTertiary }]}
                >
                  Archived
                </Text>
                <View
                  style={[
                    styles.listCard,
                    {
                      backgroundColor: hex.surface,
                      borderColor: hex.border,
                      opacity: 0.85,
                    },
                  ]}
                >
                  {archivedRoles.map((role, index) => (
                    <RoleRow
                      key={role.id}
                      role={role}
                      isArchived
                      isLast={index === archivedRoles.length - 1}
                    />
                  ))}
                </View>
              </>
            )}
          </>
        )}

        <RoleActionsModal
          visible={actionsRole !== null}
          role={actionsRole}
          onClose={() => setActionsRole(null)}
          onEdit={(r) => openRoleEditor(r.id)}
          onArchive={handleArchive}
          onDelete={handleDelete}
          deletionSafety={actionsSafety}
        />

        {confirmRole &&
          (() => {
            const policy = getRoleActionPolicy(
              confirmRole.role,
              confirmRole.safety,
            );
            const isDeleteFlow = confirmRole.action === "delete";
            return (
              <ConfirmDialog
                visible
                title={
                  isDeleteFlow
                    ? policy.deleteDialogTitle
                    : confirmRole.role.isArchived
                      ? "Restore role"
                      : policy.archiveLabel
                }
                message={
                  isDeleteFlow
                    ? policy.deleteDialogMessage
                    : policy.canArchive
                      ? "Archive keeps all logs and removes this role from active use."
                      : "Punch out before archiving this role."
                }
                confirmLabel={
                  isDeleteFlow
                    ? policy.deleteConfirmLabel
                    : policy.canArchive
                      ? confirmRole.role.isArchived
                        ? "Restore"
                        : "Archive role"
                      : "OK"
                }
                destructive={isDeleteFlow && policy.canDeletePermanently}
                onCancel={() => setConfirmRole(null)}
                onConfirm={
                  (isDeleteFlow && !policy.canDeletePermanently) ||
                  (!isDeleteFlow && !policy.canArchive)
                    ? () => setConfirmRole(null)
                    : onConfirmAction
                }
              />
            );
          })()}
      </ScrollView>
    </EdgeToEdgeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerActionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  listCard: {
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ROW_PADDING_V,
    paddingHorizontal: ROW_PADDING_H,
    gap: 12,
  },
  rowArchived: {
    opacity: 0.9,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 13,
    fontWeight: "400",
  },
  overflowBtn: {
    padding: 8,
    margin: -8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyState: {
    paddingTop: 32,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  emptyTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: 8,
  },
  emptyMessage: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  emptyCta: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: RADIUS.button,
  },
  emptyCtaLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: ACCENT.primaryForeground,
  },
});
