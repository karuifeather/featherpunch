import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useEdgeToEdgeInsets } from '@/hooks/useEdgeToEdgeInsets';
import { useRoles } from '@/hooks/useRoles';
import { useSessionStore } from '@/stores/session-store';
import { useModalStore } from '@/stores/modal-store';
import { RoleIcon } from '@/components/role-icon';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { RoleActionsModal } from '@/components/role-actions-modal';
import { OverlayHeader } from '@/components/overlay-header';
import { EdgeToEdgeScreen } from '@/components/screen-container';
import { RADIUS, TYPOGRAPHY } from '@/constants/designTokens';
import { ACCENT } from '@/constants/colors';
import { updateRole, deleteRole } from '@/db/roles';
import { useRolesStore } from '@/stores/roles-store';
import type { Role } from '@/types';

const ROW_PADDING_V = 12;
const ROW_PADDING_H = 16;
const ICON_BG_SIZE = 40;

function roleSubtitle(role: Role): string {
  const ownership = role.tag === 'me' ? 'For me' : 'For others';
  if (role.hourlyRate != null) return `${ownership} • $${role.hourlyRate}/hr`;
  return ownership;
}

export default function RolesScreen() {
  const { hex, bg } = useThemeColors();
  const { tabBarHeight, overlayHeaderHeight } = useEdgeToEdgeInsets();
  const { roles, loading, refresh } = useRoles(true);
  const router = useRouter();
  const { openRoleEditor } = useModalStore();
  const [actionsRole, setActionsRole] = useState<Role | null>(null);
  const [confirmRole, setConfirmRole] = useState<{
    role: Role;
    action: 'archive' | 'delete';
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
    }, [refreshRolesData])
  );

  useEffect(() => {
    let lastAppState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const isReturningToForeground = lastAppState.match(/inactive|background/) && nextAppState === 'active';
      if (isReturningToForeground) {
        refreshRolesData();
      }
      lastAppState = nextAppState;
    });

    return () => subscription.remove();
  }, [refreshRolesData]);

  const activeRoles = roles.filter((r) => !r.isArchived);
  const archivedRoles = roles.filter((r) => r.isArchived);

  const handleArchive = (role: Role) => setConfirmRole({ role, action: 'archive' });
  const handleDelete = (role: Role) => setConfirmRole({ role, action: 'delete' });

  const bumpRolesVersion = useRolesStore((s) => s.bumpRolesVersion);

  const onConfirmAction = async () => {
    if (!confirmRole) return;
    const { role, action } = confirmRole;
    setConfirmRole(null);
    if (action === 'archive') {
      await updateRole(role.id, { isArchived: !role.isArchived });
    } else {
      const wasActiveRole = useSessionStore.getState().active?.roleId === role.id;
      await deleteRole(role.id);
      if (wasActiveRole) useSessionStore.getState().clear();
    }
    bumpRolesVersion();
  };

  const headerSubtitle =
    activeRoles.length === 0 && !loading
      ? 'Manage the roles you live'
      : activeRoles.length === 1
        ? '1 role'
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
        <Text style={[styles.rowSubtitle, { color: hex.textSecondary }]} numberOfLines={1}>
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
        <Ionicons name="ellipsis-horizontal" size={20} color={hex.textTertiary} />
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
              <Text style={[styles.headerActionLabel, { color: ACCENT.primary }]}>
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
            <View style={[styles.listCard, { backgroundColor: hex.surface, borderColor: hex.border }]}>
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
                <Text style={[styles.sectionLabel, { color: hex.textTertiary }]}>
                  Archived
                </Text>
                <View style={[styles.listCard, { backgroundColor: hex.surface, borderColor: hex.border, opacity: 0.85 }]}>
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
        />

        {confirmRole && (
          <ConfirmDialog
            visible
            title={confirmRole.action === 'delete' ? 'Delete role' : confirmRole.role.isArchived ? 'Restore role' : 'Archive role'}
            message={
              confirmRole.action === 'delete'
                ? `Permanently delete "${confirmRole.role.name}" and all its entries? This cannot be undone.`
                : confirmRole.role.isArchived
                  ? `Restore "${confirmRole.role.name}"?`
                  : `Archive "${confirmRole.role.name}"? Historical data will be kept.`
            }
            confirmLabel={confirmRole.action === 'delete' ? 'Delete' : confirmRole.role.isArchived ? 'Restore' : 'Archive'}
            destructive={confirmRole.action === 'delete'}
            onCancel={() => setConfirmRole(null)}
            onConfirm={onConfirmAction}
          />
        )}
      </ScrollView>
    </EdgeToEdgeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerActionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  listCard: {
    borderRadius: RADIUS.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '600',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  overflowBtn: {
    padding: 8,
    margin: -8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyState: {
    paddingTop: 32,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  emptyTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: 8,
  },
  emptyMessage: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
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
    fontWeight: '600',
    color: ACCENT.primaryForeground,
  },
});
