import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useEdgeToEdgeInsets } from '@/hooks/useEdgeToEdgeInsets';
import { useRoles } from '@/hooks/useRoles';
import { useTodaySessions } from '@/hooks/useSessions';
import { useSessionStore } from '@/stores/session-store';
import { computeAnalytics } from '@/services/analytics';
import { RoleIcon } from '@/components/role-icon';
import { ActiveRoleCard } from '@/components/active-role-card';
import { RolePickerModal } from '@/components/role-picker-modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { OverlayHeader } from '@/components/overlay-header';
import { EdgeToEdgeScreen } from '@/components/screen-container';
import { RADIUS, TYPOGRAPHY, SPACING } from '@/constants/designTokens';
import { ACCENT } from '@/constants/colors';
import { formatDurationShort } from '@/utils/formatTime';
import type { Role } from '@/types';

export default function HomeScreen() {
  const { hex, bg } = useThemeColors();
  const { tabBarHeight, overlayHeaderHeight } = useEdgeToEdgeInsets();
  const { roles } = useRoles();
  const { sessions: todaySessions, refresh: refreshSessions } = useTodaySessions();
  const { active, loadActiveSession, clockIn, clockOut, switchRole, clear: clearSessionStore } = useSessionStore();
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [confirmClockInRole, setConfirmClockInRole] = useState<Role | null>(null);
  const [confirmClockOut, setConfirmClockOut] = useState(false);
  const refreshHomeData = useCallback(() => {
    refreshSessions();
    loadActiveSession();
  }, [refreshSessions, loadActiveSession]);

  useEffect(() => {
    refreshHomeData();
  }, [refreshHomeData]);

  useFocusEffect(
    useCallback(() => {
      refreshHomeData();
    }, [refreshHomeData])
  );

  useEffect(() => {
    let lastAppState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const isReturningToForeground = lastAppState.match(/inactive|background/) && nextAppState === 'active';
      if (isReturningToForeground) {
        refreshHomeData();
      }
      lastAppState = nextAppState;
    });

    return () => subscription.remove();
  }, [refreshHomeData]);

  // If active session references a deleted role, clear it to avoid FK errors and ghost UI
  useEffect(() => {
    if (active && !activeRoles.some((r) => r.id === active.roleId)) {
      clearSessionStore();
    }
  }, [active, activeRoles, clearSessionStore]);

  useFocusEffect(
    useCallback(() => {
      if (!active && todaySessions.length > 0 && !selectedRoleId) {
        const lastRoleId = todaySessions[todaySessions.length - 1]?.roleId;
        if (lastRoleId) setSelectedRoleId(lastRoleId);
      }
    }, [active, todaySessions, selectedRoleId])
  );

  const analytics = computeAnalytics(todaySessions);
  const activeRoles = roles.filter((r) => !r.isArchived);

  const recentRoleIds = useMemo(() => {
    const roleIds = new Set(activeRoles.map((r) => r.id));
    const ids: string[] = [];
    for (const s of todaySessions) {
      if (roleIds.has(s.roleId) && !ids.includes(s.roleId)) ids.push(s.roleId);
    }
    const remaining = activeRoles
      .filter((r) => !ids.includes(r.id))
      .slice(0, Math.max(0, 5 - ids.length));
    return [...ids, ...remaining.map((r) => r.id)];
  }, [todaySessions, activeRoles]);

  const selectedRole = selectedRoleId
    ? activeRoles.find((r) => r.id === selectedRoleId)
    : null;

  const handleClockIn = async (roleId: string) => {
    await clockIn(roleId);
    refreshSessions();
  };

  const confirmAndClockIn = (role: Role) => setConfirmClockInRole(role);
  const confirmAndClockOut = () => { if (active) setConfirmClockOut(true); };

  const onConfirmClockIn = async () => {
    if (confirmClockInRole) {
      await handleClockIn(confirmClockInRole.id);
      setConfirmClockInRole(null);
    }
  };

  const onConfirmClockOut = async () => {
    await clockOut().then(refreshSessions);
    setConfirmClockOut(false);
  };

  const handleSelectFromPicker = (roleId: string) => {
    setSelectedRoleId(roleId);
    setShowRolePicker(false);
    if (active) {
      switchRole(roleId).then(refreshSessions);
    }
  };

  const handleRolePillPress = (role: Role) => {
    if (active) {
      if (active.roleId === role.id) return;
      setSelectedRoleId(role.id);
      switchRole(role.id).then(refreshSessions);
    } else {
      setSelectedRoleId(role.id);
      confirmAndClockIn(role);
    }
  };

  const showRecentRoles = recentRoleIds.length >= 2;

  return (
    <EdgeToEdgeScreen
      style={{ flex: 1 }}
      overlay={<OverlayHeader title="Today" subtitle="FeatherPunch" />}
    >
      <ScrollView
        className={bg}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: overlayHeaderHeight + SPACING.base, paddingBottom: tabBarHeight + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {active ? (
          <ActiveRoleCard
            roleName={active.roleName}
            roleIcon={active.roleIcon}
            roleColor={active.roleColor}
            startAt={active.startAt}
            onClockOut={confirmAndClockOut}
            onSwitchRole={() => setShowRolePicker(true)}
            hex={hex}
          />
        ) : (
          <View style={[styles.panel, { backgroundColor: hex.surface }]}>
            <Text style={[styles.sectionTitle, { color: hex.text }]}>Ready to punch in</Text>
            <Text style={[styles.helperText, { color: hex.textSecondary }]}>
              Choose the role you're stepping into.
            </Text>
            <View style={[styles.roleSelector, { backgroundColor: hex.bg }]}>
              <Text
                style={[styles.selectorLabel, { color: selectedRole ? hex.text : hex.textSecondary }]}
              >
                {selectedRole ? selectedRole.name : 'No role selected'}
              </Text>
              <TouchableOpacity onPress={() => setShowRolePicker(true)} hitSlop={8}>
                <Text style={[styles.changeLabel, { color: ACCENT.primary }]}>Change</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() =>
                selectedRole ? confirmAndClockIn(selectedRole) : setShowRolePicker(true)
              }
              accessibilityLabel="Punch in"
              accessibilityRole="button"
              style={[styles.primaryButton, { backgroundColor: ACCENT.primary }]}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryButtonLabel}>Punch in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowRolePicker(true)}
              style={styles.secondaryAction}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryActionLabel, { color: ACCENT.primary }]}>Choose role</Text>
            </TouchableOpacity>
          </View>
        )}

        {showRecentRoles && (
          <View style={styles.recentSection}>
            <Text style={[styles.sectionLabel, { color: hex.textTertiary }]}>Recent roles</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentPills}
              nestedScrollEnabled
            >
              {recentRoleIds.slice(0, 6).map((rid) => {
                const role = activeRoles.find((r) => r.id === rid);
                if (!role) return null;
                const isActiveRole = active?.roleId === role.id;
                return (
                  <TouchableOpacity
                    key={role.id}
                    onPress={() => handleRolePillPress(role)}
                    style={[
                      styles.pill,
                      { backgroundColor: `${role.color}12` },
                      isActiveRole && { borderWidth: StyleSheet.hairlineWidth, borderColor: `${role.color}50` },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.pillDot, { backgroundColor: role.color }]} />
                    <Text style={[styles.pillLabel, { color: hex.text }]}>{role.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={[styles.summaryPanel, { backgroundColor: hex.surface }]}>
          <Text style={[styles.summaryTitle, { color: hex.textTertiary }]}>Today at a glance</Text>
          <View style={[styles.summaryRow, { borderBottomColor: hex.border }]}>
            <Text style={[styles.summaryLabel, { color: hex.textTertiary }]}>Total time</Text>
            <Text style={[styles.summaryValue, { color: hex.text }]}>
              {formatDurationShort(analytics.totalMs)}
            </Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomColor: hex.border }]}>
            <Text style={[styles.summaryLabel, { color: hex.textTertiary }]}>Punch-ins</Text>
            <Text style={[styles.summaryValue, { color: hex.text }]}>
              {analytics.sessionCount}
            </Text>
          </View>
          <View style={styles.summaryRowLast}>
            <Text style={[styles.summaryLabel, { color: hex.textTertiary }]}>Most time today</Text>
            <Text style={[styles.summaryValue, { color: hex.text }]}>
              {analytics.mostFrequentRole && analytics.totalMs > 0
                ? analytics.mostFrequentRole
                : '—'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <RolePickerModal
        visible={showRolePicker}
        onClose={() => setShowRolePicker(false)}
        onSelect={handleSelectFromPicker}
        roles={activeRoles}
        recentRoleIds={recentRoleIds}
        selectedRoleId={active?.roleId ?? selectedRoleId ?? undefined}
      />

      {confirmClockInRole && (
        <ConfirmDialog
          visible
          title="Punch in"
          message={`Continue to punch in to ${confirmClockInRole.name}?`}
          confirmLabel="Punch in"
          onCancel={() => setConfirmClockInRole(null)}
          onConfirm={onConfirmClockIn}
        />
      )}
      {confirmClockOut && active && (
        <ConfirmDialog
          visible
          title="Punch out"
          message={`Punch out of ${active.roleName}?`}
          confirmLabel="Punch out"
          onCancel={() => setConfirmClockOut(false)}
          onConfirm={onConfirmClockOut}
        />
      )}
    </EdgeToEdgeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
  },
  screenTitle: {
    ...TYPOGRAPHY.heroTitle,
    marginBottom: 20,
  },
  panel: {
    borderRadius: RADIUS.card,
    padding: 16,
    marginBottom: 18,
  },
  primaryButton: {
    borderRadius: RADIUS.button,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT.primaryForeground,
  },
  secondaryAction: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  secondaryActionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: 2,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 12,
    opacity: 0.9,
  },
  roleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  selectorLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  changeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  recentSection: {
    marginTop: 4,
    marginBottom: 20,
  },
  sectionLabel: {
    ...TYPOGRAPHY.metadata,
    marginBottom: 8,
  },
  recentPills: {
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  summaryPanel: {
    borderRadius: RADIUS.card,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.75,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});
