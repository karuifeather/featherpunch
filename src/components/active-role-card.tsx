import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { RoleIcon } from "@/components/role-icon";
import { RADIUS } from "@/constants/designTokens";
import { ACCENT } from "@/constants/colors";
import { formatDurationShort, formatTime } from "@/utils/formatTime";
import { getActiveElapsedMs } from "@/utils/activeSession";

interface ActiveRoleCardProps {
  roleName: string;
  roleIcon: string;
  roleColor: string;
  startAt: string;
  onClockOut: () => void;
  onSwitchRole: () => void;
  hex: Record<string, string>;
}

/** Active role card — calm, flat, premium. */
export function ActiveRoleCard({
  roleName,
  roleIcon,
  roleColor,
  startAt,
  onClockOut,
  onSwitchRole,
  hex,
}: ActiveRoleCardProps) {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const activeMs = getActiveElapsedMs(startAt, nowMs);

  return (
    <View style={[styles.panel, { backgroundColor: hex.surface }]}>
      <View style={[styles.accentStrip, { backgroundColor: roleColor }]} />
      <View style={styles.panelContent}>
        <View style={styles.panelHeader}>
          <RoleIcon icon={roleIcon} color={roleColor} size={14} bgSize={36} />
          <View style={styles.panelTitleBlock}>
            <Text style={[styles.statusEyebrow, { color: hex.textSecondary }]}>
              Currently tracking
            </Text>
            <Text style={[styles.roleName, { color: hex.text }]}>
              {roleName}
            </Text>
            <Text style={[styles.activeDuration, { color: hex.text }]}>
              {formatDurationShort(activeMs)} active
            </Text>
            <Text style={[styles.statusLine, { color: hex.textSecondary }]}>
              Started {formatTime(startAt)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onClockOut}
          accessibilityLabel="Punch out"
          accessibilityRole="button"
          style={[styles.primaryButton, { backgroundColor: ACCENT.primary }]}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryButtonLabel}>Punch out</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSwitchRole}
          style={styles.secondaryAction}
          activeOpacity={0.7}
          accessibilityLabel="Switch role"
          accessibilityRole="button"
        >
          <Text
            style={[styles.secondaryActionLabel, { color: ACCENT.primary }]}
          >
            Switch role
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: RADIUS.card,
    marginBottom: 20,
    overflow: "hidden",
  },
  accentStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    opacity: 0.4,
    borderTopLeftRadius: RADIUS.card,
    borderBottomLeftRadius: RADIUS.card,
  },
  panelContent: {
    padding: 16,
    paddingLeft: 18,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  panelTitleBlock: {
    flex: 1,
  },
  statusEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  roleName: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 22,
  },
  activeDuration: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  statusLine: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
    opacity: 0.85,
  },
  primaryButton: {
    borderRadius: RADIUS.button,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: ACCENT.primaryForeground,
  },
  secondaryAction: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  secondaryActionLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
