import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppModal } from "@/components/app-modal";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ACCENT } from "@/constants/colors";
import { RADIUS } from "@/constants/designTokens";
import {
  clampDayToMonth,
  getDaysInMonth,
  isValidCustomDateRange,
  type CustomDateRange,
} from "@/utils/sessionLogs";

function formatDateChip(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function partsFromIso(iso: string): {
  year: number;
  month: number;
  day: number;
} {
  const date = new Date(iso);
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
  };
}

function isoFromParts(parts: {
  year: number;
  month: number;
  day: number;
}): string {
  return new Date(
    parts.year,
    parts.month,
    parts.day,
    12,
    0,
    0,
    0,
  ).toISOString();
}

function DatePartPicker({
  title,
  valueIso,
  minYear,
  maxYear,
  onChange,
}: {
  title: string;
  valueIso: string;
  minYear: number;
  maxYear: number;
  onChange: (iso: string) => void;
}) {
  const { hex } = useThemeColors();
  const parts = partsFromIso(valueIso);
  const yearChoices = Array.from(
    { length: maxYear - minYear + 1 },
    (_, index) => minYear + index,
  );
  const monthChoices = Array.from({ length: 12 }, (_, index) => index);
  const dayChoices = Array.from(
    { length: getDaysInMonth(parts.year, parts.month) },
    (_, index) => index + 1,
  );

  const setParts = (nextParts: {
    year: number;
    month: number;
    day: number;
  }) => {
    const adjustedDay = clampDayToMonth(
      nextParts.year,
      nextParts.month,
      nextParts.day,
    );
    onChange(isoFromParts({ ...nextParts, day: adjustedDay }));
  };

  const monthLabel = (month: number): string =>
    new Date(parts.year, month, 1).toLocaleDateString(undefined, {
      month: "short",
    });

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.sectionLabel, { color: hex.textTertiary }]}>
        {title}
      </Text>
      <Text style={[styles.selectedDateText, { color: hex.text }]}>
        {formatDateChip(valueIso)}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {yearChoices.map((year) => {
          const selected = year === parts.year;
          return (
            <TouchableOpacity
              key={`${title}-year-${year}`}
              onPress={() => setParts({ ...parts, year })}
              activeOpacity={0.8}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? ACCENT.primary : hex.surface,
                  borderColor: selected ? "transparent" : hex.border,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? ACCENT.primaryForeground : hex.text,
                }}
              >
                {year}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { marginTop: 8 }]}
      >
        {monthChoices.map((month) => {
          const selected = month === parts.month;
          return (
            <TouchableOpacity
              key={`${title}-month-${month}`}
              onPress={() => setParts({ ...parts, month })}
              activeOpacity={0.8}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? ACCENT.primary : hex.surface,
                  borderColor: selected ? "transparent" : hex.border,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? ACCENT.primaryForeground : hex.text,
                }}
              >
                {monthLabel(month)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { marginTop: 8 }]}
      >
        {dayChoices.map((day) => {
          const selected = day === parts.day;
          return (
            <TouchableOpacity
              key={`${title}-day-${day}`}
              onPress={() => setParts({ ...parts, day })}
              activeOpacity={0.8}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? ACCENT.primary : hex.surface,
                  borderColor: selected ? "transparent" : hex.border,
                },
              ]}
            >
              <Text
                style={{
                  color: selected ? ACCENT.primaryForeground : hex.text,
                }}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function LogDateRangeModal({
  visible,
  initialRange,
  onClose,
  onApply,
}: {
  visible: boolean;
  initialRange: CustomDateRange;
  onClose: () => void;
  onApply: (nextRange: CustomDateRange) => void;
}) {
  const { hex } = useThemeColors();
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStartDate(initialRange.startDate);
      setEndDate(initialRange.endDate);
      setErrorText(null);
    }
  }, [visible, initialRange.endDate, initialRange.startDate]);

  const handleApply = () => {
    if (!isValidCustomDateRange({ startDate, endDate })) {
      setErrorText("End date cannot be before start date.");
      return;
    }
    setErrorText(null);
    onApply({ startDate, endDate });
  };

  return (
    <AppModal visible={visible} onClose={onClose} title="Custom range">
      <View style={styles.body}>
        <DatePartPicker
          title="Start date"
          valueIso={startDate}
          minYear={1970}
          maxYear={currentYear + 5}
          onChange={setStartDate}
        />
        <DatePartPicker
          title="End date"
          valueIso={endDate}
          minYear={1970}
          maxYear={currentYear + 5}
          onChange={setEndDate}
        />

        {errorText ? (
          <Text style={{ color: "#ef4444", marginTop: 4, fontSize: 13 }}>
            {errorText}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.button,
              { borderColor: hex.border, backgroundColor: hex.surface },
            ]}
          >
            <Text style={{ color: hex.textSecondary, fontWeight: "600" }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleApply}
            style={[styles.button, { backgroundColor: ACCENT.primary }]}
          >
            <Text
              style={{ color: ACCENT.primaryForeground, fontWeight: "600" }}
            >
              Apply
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  selectedDateText: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    marginBottom: 4,
  },
  button: {
    flex: 1,
    borderRadius: RADIUS.button,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
