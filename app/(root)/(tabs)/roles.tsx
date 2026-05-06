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
import { getRoleListSummaries } from "@/db/sessions";
import { useRolesStore } from "@/stores/roles-store";
import type { Role, RoleDeletionSafety, RoleListSummary } from "@/types";
import { getRoleActionPolicy } from "@/utils/roleDeletionPolicy";
import {
  buildRoleListItemModel,
  createEmptyRoleListSummary,
  matchesRoleFilter,
  sortRecentFirst,
  type RoleFilter,
  type RoleListItemModel,
} from "@/utils/roleListPresentation";

const ROW_PADDING_V = 14;
const ROW_PADDING_H = 16;
const ICON_BG_SIZE = 42;

export default function RolesScreen() {
  const { hex, bg } = useThemeColors();
  const { tabBarHeight, overlayHeaderHeight } = useEdgeToEdgeInsets();
  const { roles, loading, refresh } = useRoles(true);
  const router = useRouter();
  const { openRoleEditor } = useModalStore();
  const activeSession = useSessionStore((s) => s.active);
  const [actionsRole, setActionsRole] = useState<Role | null>(null);
  const [actionsSafety, setActionsSafety] = useState<RoleDeletionSafety | null>(
    null,
  );
  const [selectedFilter, setSelectedFilter] = useState<RoleFilter>("all");
  const [roleSummaries, setRoleSummaries] = useState<
    Record<string, RoleListSummary>
  >({});
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

  useEffect(() => {
    let cancelled = false;
    const loadSummaries = async () => {
      const summaries = await getRoleListSummaries(
        roles.map((role) => role.id),
      );
      if (cancelled) return;
      const nextMap: Record<string, RoleListSummary> = {};
      for (const summary of summaries) nextMap[summary.roleId] = summary;
      setRoleSummaries(nextMap);
    };
    loadSummaries();
    return () => {
      cancelled = true;
    };
  }, [roles]);

  const visibleRoles = roles.filter((r) => !r.isArchived);
  const archivedRoles = roles.filter((r) => r.isArchived);
  const visibleRoleModels = visibleRoles.map((role) =>
    buildRoleListItemModel(
      role,
      roleSummaries[role.id] ?? createEmptyRoleListSummary(role.id),
    ),
  );
  const activeModel =
    (activeSession &&
      visibleRoleModels.find(
        (model) => model.role.id === activeSession.roleId,
      )) ||
    visibleRoleModels.find((model) => model.summary.isActive) ||
    null;
  const filteredModels = visibleRoleModels.filter((model) =>
    matchesRoleFilter(model.role, model.summary, selectedFilter),
  );

  const recentModels = sortRecentFirst(
    filteredModels.filter(
      (model) =>
        model.summary.last30CompletedSessions > 0 &&
        (selectedFilter !== "all" || model.role.id !== activeModel?.role.id),
    ),
  );
  const allModels = filteredModels.filter(
    (model) =>
      model.summary.last30CompletedSessions === 0 &&
      model.role.id !== activeModel?.role.id,
  );
  const activeCount = activeModel ? 1 : 0;
  const headerSubtitle = `${filteredModels.length} ${filteredModels.length === 1 ? "role" : "roles"}${activeCount > 0 ? ` · ${activeCount} active` : ""}`;
  const emptyFilterConfig: Record<
    Exclude<RoleFilter, "all">,
    { title: string; body: string; cta?: string }
  > = {
    recent: {
      title: "No recent role activity",
      body: "No completed sessions in the last 30 days yet. Punch in to bring a role into Recent.",
      cta: "Go to Home",
    },
    paid: {
      title: "No paid roles yet",
      body: "Add an hourly rate to a role to track estimated earnings here.",
      cta: "Create paid role",
    },
    noLogs: {
      title: "Every role has at least one log",
      body: "Nice progress. Every current role already has completed history.",
    },
  };

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

  const RoleRow = ({
    item,
    isArchived,
    isLast,
    emphasizeActive,
  }: {
    item: RoleListItemModel;
    isArchived?: boolean;
    isLast?: boolean;
    emphasizeActive?: boolean;
  }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(root)/role-stats/${item.role.id}`)}
      activeOpacity={0.7}
      style={[
        styles.row,
        {
          backgroundColor: hex.surface,
          borderBottomColor: hex.border,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderLeftColor: item.role.color,
          borderLeftWidth: emphasizeActive ? 3 : 2,
        },
        isArchived && styles.rowArchived,
        emphasizeActive && { backgroundColor: `${item.role.color}14` },
      ]}
    >
      <RoleIcon
        icon={item.role.icon}
        color={item.role.color}
        size={18}
        bgSize={ICON_BG_SIZE}
      />
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: hex.text }]} numberOfLines={1}>
          {item.role.name}
        </Text>
        <Text
          style={[styles.rowSubtitle, { color: hex.textSecondary }]}
          numberOfLines={item.summary.isActive ? 2 : 1}
        >
          {item.subtitle}
        </Text>
        {item.paidSubtitle && (
          <Text
            style={[styles.rowPaidSubtitle, { color: hex.textTertiary }]}
            numberOfLines={1}
          >
            {item.paidSubtitle}
          </Text>
        )}
        {item.chips.length > 0 && (
          <View style={styles.chipsRow}>
            {item.chips.slice(0, 2).map((chip) => (
              <View
                key={chip}
                style={[
                  styles.metaChip,
                  { backgroundColor: hex.inputBg, borderColor: hex.border },
                ]}
              >
                <Text
                  style={[styles.metaChipLabel, { color: hex.textSecondary }]}
                >
                  {chip}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.rowRight}>
        {item.rightBadge === "active" ? (
          <View
            style={[
              styles.activeBadge,
              { backgroundColor: `${item.role.color}2e` },
            ]}
          >
            <Text style={[styles.activeBadgeLabel, { color: item.role.color }]}>
              Active
            </Text>
          </View>
        ) : item.rightMetric ? (
          <Text style={[styles.rightMetric, { color: hex.text }]}>
            {item.rightMetric}
          </Text>
        ) : null}
        <Text style={[styles.overflowSpacer, { color: "transparent" }]}>.</Text>
      </View>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          setActionsRole(item.role);
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
        {visibleRoles.length === 0 && !loading ? (
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
            <View style={styles.filtersRow}>
              {(
                [
                  { key: "all", label: "All" },
                  { key: "recent", label: "Recent" },
                  { key: "paid", label: "Paid" },
                  { key: "noLogs", label: "No logs" },
                ] as Array<{ key: RoleFilter; label: string }>
              ).map((filter) => {
                const selected = filter.key === selectedFilter;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    onPress={() => setSelectedFilter(filter.key)}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: selected ? hex.text : hex.border,
                        backgroundColor: selected
                          ? `${hex.text}16`
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipLabel,
                        { color: selected ? hex.text : hex.textSecondary },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedFilter === "all" && activeModel && (
              <>
                <Text
                  style={[styles.sectionLabel, { color: hex.textTertiary }]}
                >
                  Active now
                </Text>
                <View
                  style={[
                    styles.listCard,
                    { backgroundColor: hex.surface, borderColor: hex.border },
                  ]}
                >
                  <RoleRow item={activeModel} emphasizeActive isLast />
                </View>
              </>
            )}

            {recentModels.length > 0 && (
              <>
                <Text
                  style={[styles.sectionLabel, { color: hex.textTertiary }]}
                >
                  {selectedFilter === "all" ? "Recent roles" : "Filtered roles"}
                </Text>
                <View
                  style={[
                    styles.listCard,
                    { backgroundColor: hex.surface, borderColor: hex.border },
                  ]}
                >
                  {recentModels.map((item, index) => (
                    <RoleRow
                      key={item.role.id}
                      item={item}
                      isLast={index === recentModels.length - 1}
                    />
                  ))}
                </View>
              </>
            )}

            {(selectedFilter === "all"
              ? allModels.length > 0
              : recentModels.length === 0 && allModels.length > 0) && (
              <>
                <Text
                  style={[styles.sectionLabel, { color: hex.textTertiary }]}
                >
                  {selectedFilter === "all" ? "All roles" : "More roles"}
                </Text>
                <View
                  style={[
                    styles.listCard,
                    { backgroundColor: hex.surface, borderColor: hex.border },
                  ]}
                >
                  {allModels.map((item, index) => (
                    <RoleRow
                      key={item.role.id}
                      item={item}
                      isLast={index === allModels.length - 1}
                    />
                  ))}
                </View>
              </>
            )}

            {filteredModels.length === 0 && (
              <View
                style={[styles.emptyFilterState, { borderColor: hex.border }]}
              >
                <Text style={[styles.emptyTitle, { color: hex.text }]}>
                  {selectedFilter === "all"
                    ? "No roles found"
                    : emptyFilterConfig[selectedFilter].title}
                </Text>
                {selectedFilter !== "all" && (
                  <Text
                    style={[
                      styles.emptyFilterBody,
                      { color: hex.textSecondary },
                    ]}
                  >
                    {emptyFilterConfig[selectedFilter].body}
                  </Text>
                )}
                {selectedFilter !== "all" &&
                  emptyFilterConfig[selectedFilter].cta && (
                    <TouchableOpacity
                      onPress={() => {
                        if (selectedFilter === "recent") {
                          router.push("/(root)/(tabs)/home");
                          return;
                        }
                        openRoleEditor();
                      }}
                      style={[
                        styles.emptyCtaSmall,
                        { backgroundColor: ACCENT.primary },
                      ]}
                    >
                      <Text style={styles.emptyCtaLabel}>
                        {emptyFilterConfig[selectedFilter].cta}
                      </Text>
                    </TouchableOpacity>
                  )}
              </View>
            )}

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
                      item={buildRoleListItemModel(
                        role,
                        roleSummaries[role.id] ??
                          createEmptyRoleListSummary(role.id),
                      )}
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
  rowPaidSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaChipLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  rowRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginRight: 4,
    minWidth: 68,
  },
  rightMetric: {
    fontSize: 14,
    fontWeight: "700",
  },
  activeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  activeBadgeLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  overflowSpacer: {
    fontSize: 4,
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
  filtersRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  filterChipLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyState: {
    paddingTop: 32,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  emptyFilterState: {
    marginTop: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.card,
    padding: 18,
    alignItems: "center",
    gap: 14,
  },
  emptyFilterBody: {
    ...TYPOGRAPHY.body,
    textAlign: "center",
    maxWidth: 320,
  },
  emptyCtaSmall: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.button,
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
