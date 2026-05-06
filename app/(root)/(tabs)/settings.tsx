import React, { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import * as Location from "expo-location";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faMoon,
  faSun,
  faMobile,
  faFileExport,
  faFileImport,
} from "@fortawesome/free-solid-svg-icons";
import { RootState } from "@/state/store";
import { setTheme, type ThemeMode } from "@/state/settingsSlice";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useEdgeToEdgeInsets } from "@/hooks/useEdgeToEdgeInsets";
import { useRoles } from "@/hooks/useRoles";
import { OverlayHeader } from "@/components/overlay-header";
import { ExportModal } from "@/components/export-modal";
import { RADIUS } from "@/constants/designTokens";
import { getSetting, setSetting } from "@/db/settings";

const SECTION_HEADER_MARGIN_TOP = 18;
const SECTION_HEADER_MARGIN_BOTTOM = 8;

function SectionHeader({ label, first }: { label: string; first?: boolean }) {
  const { hex } = useThemeColors();
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "600",
        color: hex.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: SECTION_HEADER_MARGIN_BOTTOM,
        marginTop: first ? 0 : SECTION_HEADER_MARGIN_TOP,
      }}
    >
      {label}
    </Text>
  );
}

function SettingsRow({
  label,
  onPress,
  icon,
  rightLabel,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  rightLabel?: string;
  disabled?: boolean;
}) {
  const { hex } = useThemeColors();
  const content = (
    <>
      {icon != null && (
        <View style={{ width: 22, alignItems: "center" }}>{icon}</View>
      )}
      <Text
        style={{
          flex: 1,
          fontSize: 16,
          color: disabled ? hex.textTertiary : hex.text,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      {rightLabel != null && (
        <Text
          style={{ fontSize: 15, color: hex.textTertiary }}
          numberOfLines={1}
        >
          {rightLabel}
        </Text>
      )}
    </>
  );
  const rowStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
  };
  if (disabled || !onPress) {
    return <View style={rowStyle}>{content}</View>;
  }
  return (
    <TouchableOpacity onPress={onPress} style={rowStyle} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

function GroupCard({ children }: { children: React.ReactNode }) {
  const { hex } = useThemeColors();
  return (
    <View
      style={{
        backgroundColor: hex.surface,
        borderRadius: RADIUS.card,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: hex.border,
      }}
    >
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.settings.theme);
  const { bg, hex } = useThemeColors();
  const { overlayHeaderHeight, tabBarHeight } = useEdgeToEdgeInsets();
  const { roles, refresh } = useRoles(true);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [weatherLabel, setWeatherLabel] = useState("");
  const [weatherTempUnit, setWeatherTempUnit] = useState<"C" | "F">("C");
  const [weatherUpdating, setWeatherUpdating] = useState(false);
  const [weatherSaveStatus, setWeatherSaveStatus] = useState<string | null>(
    null,
  );
  const refreshSettingsData = useCallback(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refreshSettingsData();
  }, [refreshSettingsData]);

  useFocusEffect(
    useCallback(() => {
      refreshSettingsData();
    }, [refreshSettingsData]),
  );

  useEffect(() => {
    let lastAppState = AppState.currentState;
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        const isReturningToForeground =
          lastAppState.match(/inactive|background/) &&
          nextAppState === "active";
        if (isReturningToForeground) {
          refreshSettingsData();
        }
        lastAppState = nextAppState;
      },
    );

    return () => subscription.remove();
  }, [refreshSettingsData]);

  const loadWeatherLocationSettings = useCallback(async () => {
    const [label, unit] = await Promise.all([
      getSetting("weather_label"),
      getSetting("weather_temp_unit"),
    ]);
    setWeatherLabel(label);
    setWeatherTempUnit(unit === "F" ? "F" : "C");
  }, []);

  const setWeatherUnit = useCallback(async (unit: "C" | "F") => {
    setWeatherTempUnit(unit);
    await setSetting("weather_temp_unit", unit);
  }, []);

  useEffect(() => {
    loadWeatherLocationSettings();
  }, [loadWeatherLocationSettings]);

  useFocusEffect(
    useCallback(() => {
      loadWeatherLocationSettings();
    }, [loadWeatherLocationSettings]),
  );

  const fetchWeatherLocationOnce = useCallback(async () => {
    try {
      setWeatherUpdating(true);
      setWeatherSaveStatus(null);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setWeatherSaveStatus("Location permission denied.");
        return;
      }

      const location = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        12000,
      );
      const { latitude, longitude } = location.coords;
      if (latitude == null || longitude == null) {
        throw new Error("location coordinates unavailable");
      }

      let label = "";
      try {
        const placemarks = await withTimeout(
          Location.reverseGeocodeAsync({
            latitude,
            longitude,
          }),
          8000,
        );
        const place = placemarks[0];
        label = [place?.city, place?.region]
          .filter((part) => typeof part === "string" && part.trim().length > 0)
          .join(", ");
      } catch {
        label = "";
      }

      await Promise.all([
        setSetting("weather_label", label),
        setSetting("weather_latitude", String(latitude)),
        setSetting("weather_longitude", String(longitude)),
        setSetting("weather_location_prompted", "1"),
      ]);

      setWeatherLabel(label);
      setWeatherSaveStatus("Location updated.");
    } catch (error) {
      if (error instanceof Error && error.message === "timeout") {
        setWeatherSaveStatus("Location request timed out. Try again.");
      } else {
        setWeatherSaveStatus("Could not fetch location right now.");
      }
    } finally {
      setWeatherUpdating(false);
    }
  }, []);

  return (
    <View className={`flex-1 ${bg}`}>
      <ScrollView
        className={`flex-1 ${bg}`}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: overlayHeaderHeight + 16,
          paddingBottom: tabBarHeight + 32,
        }}
      >
        <SectionHeader label="Appearance" first />
        <GroupCard>
          <View
            style={{
              flexDirection: "row",
              padding: 10,
              gap: 8,
            }}
          >
            {(["dark", "light", "system"] as ThemeMode[]).map((t) => {
              const selected = theme === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => dispatch(setTheme(t))}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: RADIUS.sm,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected ? hex.border : "transparent",
                  }}
                  activeOpacity={0.8}
                >
                  {t === "dark" && (
                    <FontAwesomeIcon
                      icon={faMoon}
                      color={selected ? hex.text : hex.textTertiary}
                      size={14}
                    />
                  )}
                  {t === "light" && (
                    <FontAwesomeIcon
                      icon={faSun}
                      color={selected ? hex.text : hex.textTertiary}
                      size={14}
                    />
                  )}
                  {t === "system" && (
                    <FontAwesomeIcon
                      icon={faMobile}
                      color={selected ? hex.text : hex.textTertiary}
                      size={14}
                    />
                  )}
                  <Text
                    style={{
                      marginLeft: 6,
                      fontSize: 13,
                      fontWeight: selected ? "600" : "500",
                      color: selected ? hex.text : hex.textSecondary,
                    }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GroupCard>

        <SectionHeader label="Data" />
        <GroupCard>
          <View style={{ borderBottomWidth: 1, borderBottomColor: hex.border }}>
            <SettingsRow
              label="Export role log"
              onPress={() => setExportModalVisible(true)}
              icon={
                <FontAwesomeIcon
                  icon={faFileExport}
                  color={hex.textSecondary}
                  size={18}
                />
              }
            />
          </View>
          <SettingsRow
            label="Import CSV"
            rightLabel="Coming soon"
            icon={
              <FontAwesomeIcon
                icon={faFileImport}
                color={hex.textTertiary}
                size={18}
              />
            }
            disabled
          />
        </GroupCard>

        <SectionHeader label="Weather" />
        <GroupCard>
          <View style={{ padding: 14, gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                backgroundColor: hex.bg,
                borderRadius: RADIUS.sm,
                padding: 4,
                gap: 6,
              }}
            >
              {(["C", "F"] as const).map((unit) => {
                const selected = weatherTempUnit === unit;
                return (
                  <TouchableOpacity
                    key={unit}
                    onPress={() => setWeatherUnit(unit)}
                    style={{
                      flex: 1,
                      borderRadius: RADIUS.sm,
                      paddingVertical: 8,
                      alignItems: "center",
                      backgroundColor: selected ? hex.surface : "transparent",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: selected ? "700" : "500",
                        color: selected ? hex.text : hex.textSecondary,
                      }}
                    >
                      {unit}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ fontSize: 13, color: hex.textSecondary }}>
              Weather location updates only when you tap the button below.
            </Text>
            {weatherLabel ? (
              <Text style={{ fontSize: 13, color: hex.textSecondary }}>
                Current: {weatherLabel}
              </Text>
            ) : null}
            <TouchableOpacity
              onPress={fetchWeatherLocationOnce}
              style={{
                backgroundColor: hex.text,
                borderRadius: RADIUS.sm,
                paddingVertical: 10,
                alignItems: "center",
              }}
              activeOpacity={0.8}
              disabled={weatherUpdating}
            >
              {weatherUpdating ? (
                <ActivityIndicator size="small" color={hex.bg} />
              ) : (
                <Text
                  style={{ color: hex.bg, fontWeight: "600", fontSize: 14 }}
                >
                  Use current location now
                </Text>
              )}
            </TouchableOpacity>
            {weatherSaveStatus ? (
              <Text style={{ fontSize: 12, color: hex.textSecondary }}>
                {weatherSaveStatus}
              </Text>
            ) : null}
          </View>
        </GroupCard>

        <SectionHeader label="About" />
        <View
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: hex.text,
            }}
          >
            FeatherPunch
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: hex.textSecondary,
              marginTop: 4,
              lineHeight: 20,
            }}
          >
            See where your time goes.
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: hex.textTertiary,
              marginTop: 6,
              lineHeight: 18,
            }}
          >
            Local-first. No accounts. Your data stays on your device.
          </Text>
        </View>

        <ExportModal
          visible={exportModalVisible}
          onClose={() => setExportModalVisible(false)}
          roles={roles}
        />
      </ScrollView>
      <OverlayHeader title="Settings" />
    </View>
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    });
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle != null) {
      clearTimeout(timeoutHandle);
    }
  }
}
