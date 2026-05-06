import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RADIUS, TYPOGRAPHY } from "@/constants/designTokens";
import { useThemeColors } from "@/hooks/useThemeColors";

type FilterOption = {
  id: string;
  label: string;
};

function FilterPills({
  options,
  selectedId,
  onSelect,
}: {
  options: FilterOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { hex } = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <TouchableOpacity
            key={option.id}
            onPress={() => onSelect(option.id)}
            activeOpacity={0.8}
            style={[
              styles.pill,
              {
                borderColor: selected ? "transparent" : hex.border,
                backgroundColor: selected ? hex.text : hex.surface,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: selected ? hex.bg : hex.textSecondary,
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function LogFilterBar({
  rangeOptions,
  roleOptions,
  selectedRangeId,
  selectedRoleId,
  onSelectRange,
  onSelectRole,
  rangeSummaryText,
}: {
  rangeOptions: FilterOption[];
  roleOptions: FilterOption[];
  selectedRangeId: string;
  selectedRoleId: string;
  onSelectRange: (id: string) => void;
  onSelectRole: (id: string) => void;
  rangeSummaryText: string;
}) {
  const { hex } = useThemeColors();

  return (
    <View style={styles.container}>
      <FilterPills
        options={rangeOptions}
        selectedId={selectedRangeId}
        onSelect={onSelectRange}
      />
      <Text
        style={{
          ...TYPOGRAPHY.metadata,
          color: hex.textTertiary,
          marginTop: 10,
        }}
      >
        {rangeSummaryText}
      </Text>
      <View style={{ marginTop: 12 }}>
        <FilterPills
          options={roleOptions}
          selectedId={selectedRoleId}
          onSelect={onSelectRole}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
