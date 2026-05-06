import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { RoleIcon } from "./role-icon";
import { TYPOGRAPHY, RADIUS } from "@/constants/designTokens";

interface RolePillProps {
  name: string;
  icon: string;
  color: string;
  isActive?: boolean;
  onPress?: () => void;
  size?: "sm" | "md";
  accessibilityLabel?: string;
}

export function RolePill({
  name,
  icon,
  color,
  isActive = false,
  onPress,
  size = "md",
  accessibilityLabel,
}: RolePillProps) {
  const isSm = size === "sm";
  const bgSize = isSm ? 28 : 34;
  const iconSize = isSm ? 13 : 16;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={
        accessibilityLabel ??
        (isActive ? `Active role: ${name}` : `Punch in to ${name}`)
      }
      accessibilityRole="button"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: isSm ? 6 : 8,
        paddingVertical: isSm ? 6 : 8,
        paddingHorizontal: isSm ? 10 : 14,
        borderRadius: RADIUS.pill,
        backgroundColor: isActive ? `${color}30` : `${color}12`,
        borderWidth: isActive ? 1.5 : 0,
        borderColor: isActive ? `${color}60` : "transparent",
      }}
    >
      <RoleIcon
        icon={icon}
        color={color}
        size={iconSize}
        bgSize={bgSize}
        showBg={false}
      />
      <Text
        style={{
          ...TYPOGRAPHY[isSm ? "caption" : "pillLabel"],
          color: color,
          fontWeight: "600",
        }}
      >
        {name}
      </Text>
    </TouchableOpacity>
  );
}
