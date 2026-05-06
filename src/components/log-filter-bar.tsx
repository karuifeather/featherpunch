import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ACCENT, RADIUS, TYPOGRAPHY } from "@/constants/designTokens";
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
      contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
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
                fontSize: 12,
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
  selectedRangeLabel,
  selectedRoleLabel,
  onPressExport,
  canExport,
  isExporting,
}: {
  rangeOptions: FilterOption[];
  roleOptions: FilterOption[];
  selectedRangeId: string;
  selectedRoleId: string;
  onSelectRange: (id: string) => void;
  onSelectRole: (id: string) => void;
  rangeSummaryText: string;
  selectedRangeLabel: string;
  selectedRoleLabel: string;
  onPressExport: () => void;
  canExport: boolean;
  isExporting: boolean;
}) {
  const { hex } = useThemeColors();

  return (
    <View style={styles.container}>
      <Text style={{ ...TYPOGRAPHY.body, color: hex.text, fontWeight: "600" }}>
        {rangeSummaryText}
      </Text>
      <View style={styles.summaryRow}>
        <Text style={{ ...TYPOGRAPHY.metadata, color: hex.textSecondary }}>
          Range: {selectedRangeLabel}
        </Text>
        <Text style={{ ...TYPOGRAPHY.metadata, color: hex.textSecondary }}>
          Role: {selectedRoleLabel}
        </Text>
      </View>
      <FilterPills
        options={rangeOptions}
        selectedId={selectedRangeId}
        onSelect={onSelectRange}
      />
      <View style={{ marginTop: 10 }}>
        <FilterPills
          options={roleOptions}
          selectedId={selectedRoleId}
          onSelect={onSelectRole}
        />
      </View>
      <TouchableOpacity
        onPress={onPressExport}
        disabled={!canExport || isExporting}
        style={{
          marginTop: 10,
          alignSelf: "flex-end",
          opacity: canExport ? 1 : 0.6,
        }}
        accessibilityRole="button"
        accessibilityLabel="Export current logs"
      >
        <Text
          style={{
            ...TYPOGRAPHY.metadata,
            color: ACCENT.primary,
            fontWeight: "600",
          }}
        >
          {isExporting ? "Exporting..." : "Export CSV"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 2,
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
});
