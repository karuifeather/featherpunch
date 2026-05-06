import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useThemeColors } from "@/hooks/useThemeColors";
import { AppModal } from "@/components/app-modal";
import { RADIUS } from "@/constants/designTokens";
import { ACCENT } from "@/constants/colors";
import {
  getDayLabel,
  getMinutesSinceMidnight,
  isoFromLocalDateAndMinutes,
} from "@/utils/formatTime";

const TIME_STEP_MIN = 15;
const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const DATE_RANGE_DAYS_BACK = 60;
const DATE_RANGE_DAYS_FORWARD = 7;

interface DateOption {
  label: string;
  y: number;
  m: number;
  d: number;
}

interface TimeOption {
  label: string;
  minutesSinceMidnight: number;
}

function buildDateOptions(): DateOption[] {
  const options: DateOption[] = [];
  const now = new Date();
  for (let i = -DATE_RANGE_DAYS_BACK; i <= DATE_RANGE_DAYS_FORWARD; i++) {
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + i,
      12,
      0,
      0,
      0,
    );
    const iso = d.toISOString();
    options.push({
      label: getDayLabel(iso),
      y: d.getFullYear(),
      m: d.getMonth(),
      d: d.getDate(),
    });
  }
  return options;
}

function buildTimeOptions(): TimeOption[] {
  const options: TimeOption[] = [];
  for (let min = 0; min < 24 * 60; min += TIME_STEP_MIN) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    const label = `${h12}:${m < 10 ? "0" + m : m} ${period}`;
    options.push({ label, minutesSinceMidnight: min });
  }
  return options;
}

const DATE_OPTIONS = buildDateOptions();
const TIME_OPTIONS = buildTimeOptions();

/** Build date options from min to max (inclusive), one day each. */
function buildDateOptionsFromRange(
  minDateIso: string,
  maxDateIso: string,
): DateOption[] {
  const options: DateOption[] = [];
  const min = new Date(minDateIso);
  const max = new Date(maxDateIso);
  min.setHours(0, 0, 0, 0);
  max.setHours(0, 0, 0, 0);
  const d = new Date(min);
  while (d.getTime() <= max.getTime()) {
    const iso = d.toISOString();
    options.push({
      label: getDayLabel(iso),
      y: d.getFullYear(),
      m: d.getMonth(),
      d: d.getDate(),
    });
    d.setDate(d.getDate() + 1);
  }
  return options;
}

function findDateIndex(isoString: string, dateOptions: DateOption[]): number {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const i = dateOptions.findIndex((o) => o.y === y && o.m === m && o.d === day);
  return i >= 0 ? i : 0;
}

function findTimeIndex(isoString: string): number {
  const min = getMinutesSinceMidnight(isoString);
  const rounded = Math.round(min / TIME_STEP_MIN) * TIME_STEP_MIN;
  const clamped = Math.min(rounded, 24 * 60 - TIME_STEP_MIN);
  const i = TIME_OPTIONS.findIndex((o) => o.minutesSinceMidnight === clamped);
  return i >= 0 ? i : 0;
}

interface DateTimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  initialIso: string;
  onSelect: (iso: string) => void;
  title: string;
  /** When true, only time can be changed; date is taken from initialIso. */
  timeOnly?: boolean;
  /** When set, date picker is restricted to this range (same day or +1 for end). */
  minDateIso?: string;
  maxDateIso?: string;
}

/** Brand-custom date & time picker — bottom sheet, app tokens. Use timeOnly for log editing (change time only). */
export function DateTimePickerModal({
  visible,
  onClose,
  initialIso,
  onSelect,
  title,
  timeOnly = false,
  minDateIso,
  maxDateIso,
}: DateTimePickerModalProps) {
  const { hex } = useThemeColors();
  const [dateIndex, setDateIndex] = useState(0);
  const [timeIndex, setTimeIndex] = useState(0);
  const timeScrollRef = useRef<ScrollView>(null);

  const dateOptions = useMemo(
    () =>
      minDateIso != null && maxDateIso != null
        ? buildDateOptionsFromRange(minDateIso, maxDateIso)
        : DATE_OPTIONS,
    [minDateIso, maxDateIso],
  );

  useEffect(() => {
    if (visible && initialIso) {
      setDateIndex(findDateIndex(initialIso, dateOptions));
      setTimeIndex(findTimeIndex(initialIso));
    }
  }, [visible, initialIso, dateOptions]);

  const selectedDate = dateOptions[dateIndex];
  const selectedTime = TIME_OPTIONS[timeIndex];

  const handleConfirm = () => {
    if (!selectedTime) return;
    if (timeOnly && initialIso) {
      const d = new Date(initialIso);
      const iso = isoFromLocalDateAndMinutes(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        selectedTime.minutesSinceMidnight,
      );
      onSelect(iso);
    } else if (selectedDate) {
      const iso = isoFromLocalDateAndMinutes(
        selectedDate.y,
        selectedDate.m,
        selectedDate.d,
        selectedTime.minutesSinceMidnight,
      );
      onSelect(iso);
    } else return;
    onClose();
  };

  useEffect(() => {
    if (visible && timeScrollRef.current) {
      const y = Math.max(
        0,
        timeIndex * ROW_HEIGHT -
          (VISIBLE_ROWS * ROW_HEIGHT) / 2 +
          ROW_HEIGHT / 2,
      );
      setTimeout(
        () => timeScrollRef.current?.scrollTo({ y, animated: false }),
        100,
      );
    }
  }, [visible, timeIndex]);

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={title}
      headerRight={
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <Text style={[styles.cancelText, { color: ACCENT.primary }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.body}>
        {!timeOnly && (
          <>
            <Text style={[styles.sectionLabel, { color: hex.textTertiary }]}>
              Date
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateStrip}
            >
              {dateOptions.map((opt, i) => (
                <TouchableOpacity
                  key={`${opt.y}-${opt.m}-${opt.d}`}
                  onPress={() => setDateIndex(i)}
                  style={[
                    styles.dateChip,
                    {
                      backgroundColor:
                        i === dateIndex ? ACCENT.primary : hex.surface,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.dateChipLabel,
                      {
                        color:
                          i === dateIndex ? ACCENT.primaryForeground : hex.text,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text
          style={[
            styles.sectionLabel,
            { color: hex.textTertiary, marginTop: timeOnly ? 0 : 16 },
          ]}
        >
          Time
        </Text>
        <View
          style={[
            styles.timeListWrap,
            { height: VISIBLE_ROWS * ROW_HEIGHT, backgroundColor: hex.surface },
          ]}
        >
          <ScrollView
            ref={timeScrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingVertical: (VISIBLE_ROWS * ROW_HEIGHT) / 2 - ROW_HEIGHT / 2,
              paddingHorizontal: 16,
            }}
          >
            {TIME_OPTIONS.map((opt, i) => (
              <TouchableOpacity
                key={opt.minutesSinceMidnight}
                onPress={() => setTimeIndex(i)}
                style={[
                  styles.timeRow,
                  {
                    backgroundColor:
                      i === timeIndex ? `${ACCENT.primary}22` : "transparent",
                    borderRadius: RADIUS.md,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.timeRowLabel,
                    {
                      color: i === timeIndex ? hex.text : hex.textSecondary,
                      fontWeight: i === timeIndex ? "600" : "500",
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          onPress={handleConfirm}
          style={[styles.confirmBtn, { backgroundColor: ACCENT.primary }]}
          activeOpacity={0.88}
        >
          <Text style={styles.confirmLabel}>Set time</Text>
        </TouchableOpacity>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
  },
  cancelText: { fontSize: 16, fontWeight: "500" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  dateStrip: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  dateChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
  },
  dateChipLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  timeListWrap: {
    borderRadius: RADIUS.card,
    overflow: "hidden",
    marginTop: 4,
  },
  timeRow: {
    height: ROW_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  timeRowLabel: {
    fontSize: 16,
  },
  confirmBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: RADIUS.button,
    alignItems: "center",
  },
  confirmLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: ACCENT.primaryForeground,
  },
});
