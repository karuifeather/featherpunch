import React from "react";
import { View, Text } from "react-native";
import { useThemeColors } from "@/hooks/useThemeColors";
import { formatSinceTime } from "@/utils/formatTime";
import { TYPOGRAPHY } from "@/constants/designTokens";

interface ActiveRoleDisplayProps {
  startAt: string;
  color: string;
  roleName: string;
  roleIcon: string;
  isActive: boolean;
}

/** Status display when punched in. No running timer — calm, professional. */
export function ActiveRoleDisplay(props: ActiveRoleDisplayProps) {
  const { startAt, color, roleName } = props;
  const { hex } = useThemeColors();

  return (
    <View
      style={{ alignItems: "center", gap: 12 }}
      accessibilityLabel={`Punched in to ${roleName}. ${formatSinceTime(startAt)}`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: color,
          }}
        />
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: hex.text,
          }}
        >
          {roleName}
        </Text>
      </View>
      <Text
        style={{
          ...TYPOGRAPHY.metadata,
          color: hex.textSecondary,
        }}
      >
        Punched in
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "500",
          color: hex.text,
        }}
      >
        {formatSinceTime(startAt)}
      </Text>
    </View>
  );
}
