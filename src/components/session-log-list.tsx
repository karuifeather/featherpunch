import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS } from "@/constants/designTokens";
import { useThemeColors } from "@/hooks/useThemeColors";
import { formatDurationShort, formatTime } from "@/utils/formatTime";
import { RoleIcon } from "@/components/role-icon";
import type { SessionLogGroup } from "@/utils/sessionLogs";
import type { SessionLogEntry } from "@/types";

function LogRow({
  entry,
  showRoleName,
  onPress,
}: {
  entry: SessionLogEntry;
  showRoleName: boolean;
  onPress?: (entry: SessionLogEntry) => void;
}) {
  const { hex } = useThemeColors();
  const hasNotes = entry.notes != null && entry.notes.trim().length > 0;
  const timeRange = `${formatTime(entry.startAt)} - ${formatTime(entry.endAt)}`;
  const rowContent = (
    <View style={styles.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {showRoleName ? (
          <View style={styles.roleLine}>
            <RoleIcon
              icon={entry.roleIcon}
              color={entry.roleColor}
              size={12}
              bgSize={24}
            />
            <Text
              style={{ fontSize: 14, fontWeight: "600", color: hex.text }}
              numberOfLines={1}
            >
              {entry.roleName}
            </Text>
          </View>
        ) : null}
        <Text
          style={{ fontSize: 13, color: hex.textSecondary, marginTop: 2 }}
          numberOfLines={1}
        >
          {timeRange} · {formatDurationShort(entry.durationMs)}
        </Text>
        {hasNotes ? (
          <Text
            style={{ fontSize: 12, color: hex.textTertiary, marginTop: 3 }}
            numberOfLines={2}
          >
            {entry.notes!.trim()}
          </Text>
        ) : null}
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={16} color={hex.textTertiary} />
      ) : null}
    </View>
  );

  if (!onPress) return rowContent;
  return (
    <TouchableOpacity
      onPress={() => onPress(entry)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`Edit log from ${timeRange}`}
      accessibilityHint="Opens this log entry in the editor."
    >
      {rowContent}
    </TouchableOpacity>
  );
}

export function SessionLogList({
  groups,
  showRoleName,
  onPressEntry,
}: {
  groups: SessionLogGroup[];
  showRoleName: boolean;
  onPressEntry?: (entry: SessionLogEntry) => void;
}) {
  const { hex } = useThemeColors();

  return (
    <View style={{ gap: 14 }}>
      {groups.map((group) => (
        <View key={group.dayKey}>
          <View style={styles.dayHeader}>
            <Text style={[styles.dayLabel, { color: hex.textTertiary }]}>
              {group.label}
            </Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  fontSize: 12,
                  color: hex.textSecondary,
                  fontWeight: "600",
                }}
              >
                {formatDurationShort(group.totalDurationMs)}
              </Text>
              <Text
                style={{ fontSize: 11, color: hex.textTertiary, marginTop: 1 }}
              >
                {group.sessionCount}{" "}
                {group.sessionCount === 1 ? "session" : "sessions"}
              </Text>
            </View>
          </View>
          <View
            style={{
              backgroundColor: hex.surface,
              borderRadius: RADIUS.card,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: hex.border,
              overflow: "hidden",
            }}
          >
            {group.entries.map((entry, index) => (
              <View
                key={entry.id}
                style={{
                  borderBottomWidth:
                    index === group.entries.length - 1
                      ? 0
                      : StyleSheet.hairlineWidth,
                  borderBottomColor: hex.border,
                }}
              >
                <LogRow
                  entry={entry}
                  showRoleName={showRoleName}
                  onPress={onPressEntry}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dayLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingHorizontal: 2,
  },
  dayHeader: {
    marginBottom: 6,
    paddingHorizontal: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
});
