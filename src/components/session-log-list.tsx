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
  onPress,
}: {
  entry: SessionLogEntry;
  onPress?: (entry: SessionLogEntry) => void;
}) {
  const { hex } = useThemeColors();
  const hasNotes = entry.notes != null && entry.notes.trim().length > 0;
  const timeRange = `${formatTime(entry.startAt)} - ${formatTime(entry.endAt)}`;
  const rowContent = (
    <View style={styles.row}>
      <RoleIcon
        icon={entry.roleIcon}
        color={entry.roleColor}
        size={14}
        bgSize={34}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{ fontSize: 15, fontWeight: "600", color: hex.text }}
          numberOfLines={1}
        >
          {entry.roleName}
        </Text>
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
        <Ionicons name="create-outline" size={17} color={hex.textTertiary} />
      ) : null}
    </View>
  );

  if (!onPress) return rowContent;
  return (
    <TouchableOpacity onPress={() => onPress(entry)} activeOpacity={0.75}>
      {rowContent}
    </TouchableOpacity>
  );
}

export function SessionLogList({
  groups,
  onPressEntry,
}: {
  groups: SessionLogGroup[];
  onPressEntry?: (entry: SessionLogEntry) => void;
}) {
  const { hex } = useThemeColors();

  return (
    <View style={{ gap: 14 }}>
      {groups.map((group) => (
        <View key={group.dayKey}>
          <Text style={[styles.dayLabel, { color: hex.textTertiary }]}>
            {group.label}
          </Text>
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
                <LogRow entry={entry} onPress={onPressEntry} />
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
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
