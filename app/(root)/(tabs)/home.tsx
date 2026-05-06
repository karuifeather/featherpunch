import React, { useCallback, useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  AppState,
  AppStateStatus,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useEdgeToEdgeInsets } from "@/hooks/useEdgeToEdgeInsets";
import { useRoles } from "@/hooks/useRoles";
import { useTodaySessions } from "@/hooks/useSessions";
import { useSessionStore } from "@/stores/session-store";
import { ActiveRoleCard } from "@/components/active-role-card";
import { RolePickerModal } from "@/components/role-picker-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { OverlayHeader } from "@/components/overlay-header";
import { EdgeToEdgeScreen } from "@/components/screen-container";
import { RADIUS, TYPOGRAPHY, SPACING } from "@/constants/designTokens";
import { ACCENT } from "@/constants/colors";
import { formatDurationShort } from "@/utils/formatTime";
import {
  deriveHomeTodaySummary,
  resolveLastEngagedRole,
} from "@/utils/activeSession";
import { getSetting, setSetting } from "@/db/settings";
import { getLastEngagedRoleId } from "@/db/sessions";
import type { Role } from "@/types";

export default function HomeScreen() {
  const router = useRouter();
  const { hex, bg } = useThemeColors();
  const { tabBarHeight, overlayHeaderHeight } = useEdgeToEdgeInsets();
  const { roles } = useRoles();
  const { sessions: todaySessions, refresh: refreshSessions } =
    useTodaySessions();
  const {
    active,
    loadActiveSession,
    clockIn,
    clockOut,
    switchRole,
    clear: clearSessionStore,
  } = useSessionStore();
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [lastEngagedRoleId, setLastEngagedRoleId] = useState<string | null>(
    null,
  );
  const [confirmClockInRole, setConfirmClockInRole] = useState<Role | null>(
    null,
  );
  const [confirmClockOut, setConfirmClockOut] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<{
    temperature: number;
    weatherCode: number;
  } | null>(null);
  const [weatherLocationName, setWeatherLocationName] = useState<string | null>(
    null,
  );
  const [weatherTempUnit, setWeatherTempUnit] = useState<"C" | "F">("C");
  const [weatherLoading, setWeatherLoading] = useState(true);
  const activeRoles = roles.filter((r) => !r.isArchived);

  const loadLastEngagedRole = useCallback(async () => {
    const savedRoleId = await getSetting("last_engaged_role_id");
    const fallbackRoleId =
      savedRoleId || (await getLastEngagedRoleId()) || null;
    setLastEngagedRoleId(fallbackRoleId);
  }, []);

  const refreshHomeData = useCallback(() => {
    refreshSessions();
    loadActiveSession();
    loadLastEngagedRole();
  }, [refreshSessions, loadActiveSession, loadLastEngagedRole]);

  const fetchWeather = useCallback(async () => {
    try {
      setWeatherLoading(true);
      const [savedLat, savedLon, savedLabel, savedUnit] = await Promise.all([
        getSetting("weather_latitude"),
        getSetting("weather_longitude"),
        getSetting("weather_label"),
        getSetting("weather_temp_unit"),
      ]);
      const unit = savedUnit === "F" ? "F" : "C";
      setWeatherTempUnit(unit);

      let latitude = Number(savedLat);
      let longitude = Number(savedLon);
      const hasSavedCoords =
        savedLat.trim().length > 0 &&
        savedLon.trim().length > 0 &&
        !Number.isNaN(latitude) &&
        !Number.isNaN(longitude);

      if (!hasSavedCoords) {
        const locationResponse = await fetch("https://ipapi.co/json/");
        if (!locationResponse.ok) throw new Error("location lookup failed");
        const locationJson = (await locationResponse.json()) as {
          latitude?: number;
          longitude?: number;
        };
        if (locationJson.latitude == null || locationJson.longitude == null) {
          throw new Error("missing location coordinates");
        }
        latitude = locationJson.latitude;
        longitude = locationJson.longitude;
      }

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=${unit === "F" ? "fahrenheit" : "celsius"}`,
      );
      if (!weatherResponse.ok) throw new Error("weather lookup failed");
      const weatherJson = (await weatherResponse.json()) as {
        current?: {
          temperature_2m?: number;
          weather_code?: number;
        };
      };

      if (
        weatherJson.current?.temperature_2m != null &&
        weatherJson.current.weather_code != null
      ) {
        setWeather({
          temperature: Math.round(weatherJson.current.temperature_2m),
          weatherCode: weatherJson.current.weather_code,
        });
        setWeatherLocationName(
          savedLabel.trim().length > 0 ? savedLabel.trim() : null,
        );
      } else {
        setWeather(null);
      }
    } catch {
      setWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshHomeData();
  }, [refreshHomeData]);

  useFocusEffect(
    useCallback(() => {
      refreshHomeData();
      fetchWeather();
    }, [refreshHomeData, fetchWeather]),
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
          refreshHomeData();
        }
        lastAppState = nextAppState;
      },
    );

    return () => subscription.remove();
  }, [refreshHomeData]);

  // If active session references a deleted role, clear it to avoid FK errors and ghost UI
  useEffect(() => {
    if (active && !activeRoles.some((r) => r.id === active.roleId)) {
      clearSessionStore();
    }
  }, [active, activeRoles, clearSessionStore]);

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    fetchWeather();
    const intervalId = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchWeather]);

  useEffect(() => {
    let cancelled = false;

    const maybePromptForLocation = async () => {
      const [prompted, lat, lon] = await Promise.all([
        getSetting("weather_location_prompted"),
        getSetting("weather_latitude"),
        getSetting("weather_longitude"),
      ]);
      if (cancelled) return;
      const hasSavedCoords = lat.trim().length > 0 && lon.trim().length > 0;
      if (prompted === "1" || hasSavedCoords) return;

      Alert.alert(
        "Set weather location",
        "Add your location in Settings to make Home weather more accurate.",
        [
          {
            text: "Later",
            style: "cancel",
            onPress: () => {
              void setSetting("weather_location_prompted", "1");
            },
          },
          {
            text: "Open Settings",
            onPress: () => {
              void setSetting("weather_location_prompted", "1");
              router.push("/(root)/(tabs)/settings");
            },
          },
        ],
      );
    };

    maybePromptForLocation();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const weatherLabel = useMemo(() => {
    if (weatherLoading) return "Loading";
    if (!weather) return "Weather unavailable";
    if (weatherLocationName) {
      return `${weatherEmoji(weather.weatherCode)} ${weather.temperature}°${weatherTempUnit} · ${weatherLocationName}`;
    }
    return `${weatherEmoji(weather.weatherCode)} ${weather.temperature}°${weatherTempUnit}`;
  }, [weather, weatherLoading, weatherLocationName, weatherTempUnit]);

  const recentRoleIds = useMemo(() => {
    const roleIds = new Set(activeRoles.map((r) => r.id));
    const ids: string[] = [];
    for (const s of todaySessions) {
      if (roleIds.has(s.roleId) && !ids.includes(s.roleId)) ids.push(s.roleId);
    }
    const remaining = activeRoles
      .filter((r) => !ids.includes(r.id))
      .slice(0, Math.max(0, 5 - ids.length));
    return [...ids, ...remaining.map((r) => r.id)];
  }, [todaySessions, activeRoles]);

  const selectedRole = selectedRoleId
    ? activeRoles.find((r) => r.id === selectedRoleId)
    : null;
  const lastEngagedRole = resolveLastEngagedRole(
    lastEngagedRoleId,
    activeRoles,
  );

  useEffect(() => {
    if (!selectedRoleId && !active && lastEngagedRole) {
      setSelectedRoleId(lastEngagedRole.id);
    }
  }, [selectedRoleId, active, lastEngagedRole]);

  const todaySummary = useMemo(
    () =>
      deriveHomeTodaySummary(
        todaySessions,
        active ? { roleName: active.roleName, startAt: active.startAt } : null,
        now.getTime(),
      ),
    [todaySessions, active, now],
  );

  const handleClockIn = async (roleId: string) => {
    await clockIn(roleId);
    refreshSessions();
  };

  const confirmAndClockIn = (role: Role) => setConfirmClockInRole(role);
  const confirmAndClockOut = () => {
    if (active) setConfirmClockOut(true);
  };

  const onConfirmClockIn = async () => {
    if (confirmClockInRole) {
      await handleClockIn(confirmClockInRole.id);
      setLastEngagedRoleId(confirmClockInRole.id);
      setConfirmClockInRole(null);
    }
  };

  const onConfirmClockOut = async () => {
    await clockOut().then(refreshSessions);
    if (active?.roleId) {
      setLastEngagedRoleId(active.roleId);
    }
    setConfirmClockOut(false);
  };

  const handleSelectFromPicker = (roleId: string) => {
    setSelectedRoleId(roleId);
    setShowRolePicker(false);
    if (active) {
      switchRole(roleId).then(refreshSessions);
    }
  };

  const handleRolePillPress = (role: Role) => {
    if (active) {
      if (active.roleId === role.id) return;
      setSelectedRoleId(role.id);
      switchRole(role.id).then(refreshSessions);
    } else {
      setSelectedRoleId(role.id);
      confirmAndClockIn(role);
    }
  };

  const showRecentRoles = recentRoleIds.length >= 2;

  return (
    <EdgeToEdgeScreen
      style={{ flex: 1 }}
      overlay={
        <OverlayHeader
          title="Home"
          trailing={
            <View
              style={[
                styles.weatherBadge,
                {
                  backgroundColor: hex.surface,
                  borderColor: hex.border,
                },
              ]}
            >
              {weatherLoading ? (
                <ActivityIndicator size="small" color={hex.textSecondary} />
              ) : (
                <Text
                  style={[styles.weatherLabel, { color: hex.textSecondary }]}
                  numberOfLines={1}
                >
                  {weatherLabel}
                </Text>
              )}
            </View>
          }
        />
      }
    >
      <ScrollView
        className={bg}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: overlayHeaderHeight + SPACING.base,
            paddingBottom: tabBarHeight + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.greeting, { color: hex.text }]}>
              {now.getHours() < 12
                ? "Good morning"
                : now.getHours() < 18
                  ? "Good afternoon"
                  : "Good evening"}
            </Text>
            <Text style={[styles.currentTime, { color: hex.textSecondary }]}>
              {now.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </Text>
          </View>
          <Text style={[styles.currentDate, { color: hex.textSecondary }]}>
            {now.toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>

        {active ? (
          <ActiveRoleCard
            roleName={active.roleName}
            roleIcon={active.roleIcon}
            roleColor={active.roleColor}
            startAt={active.startAt}
            onClockOut={confirmAndClockOut}
            onSwitchRole={() => setShowRolePicker(true)}
            hex={hex}
          />
        ) : (
          <View style={[styles.panel, { backgroundColor: hex.surface }]}>
            <Text style={[styles.sectionTitle, { color: hex.text }]}>
              Ready to punch in
            </Text>
            <Text style={[styles.helperText, { color: hex.textSecondary }]}>
              {lastEngagedRole
                ? `Last role: ${lastEngagedRole.name}`
                : selectedRole
                  ? `Selected role: ${selectedRole.name}`
                  : "Choose the role you're stepping into."}
            </Text>
            <TouchableOpacity
              onPress={() =>
                lastEngagedRole
                  ? confirmAndClockIn(lastEngagedRole)
                  : selectedRole
                    ? confirmAndClockIn(selectedRole)
                    : setShowRolePicker(true)
              }
              accessibilityLabel="Punch in"
              accessibilityRole="button"
              style={[
                styles.primaryButton,
                { backgroundColor: ACCENT.primary },
              ]}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryButtonLabel}>
                {lastEngagedRole
                  ? `Clock in to ${lastEngagedRole.name}`
                  : selectedRole
                    ? `Clock in to ${selectedRole.name}`
                    : "Punch in"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowRolePicker(true)}
              style={styles.secondaryAction}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.secondaryActionLabel, { color: ACCENT.primary }]}
              >
                Choose role
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showRecentRoles && (
          <View style={styles.recentSection}>
            <Text style={[styles.sectionLabel, { color: hex.textTertiary }]}>
              Recent roles
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentPills}
              nestedScrollEnabled
            >
              {recentRoleIds.slice(0, 6).map((rid) => {
                const role = activeRoles.find((r) => r.id === rid);
                if (!role) return null;
                const isActiveRole = active?.roleId === role.id;
                return (
                  <TouchableOpacity
                    key={role.id}
                    onPress={() => handleRolePillPress(role)}
                    style={[
                      styles.pill,
                      { backgroundColor: `${role.color}12` },
                      isActiveRole && {
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: `${role.color}50`,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.pillDot, { backgroundColor: role.color }]}
                    />
                    <Text style={[styles.pillLabel, { color: hex.text }]}>
                      {role.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={[styles.summaryPanel, { backgroundColor: hex.surface }]}>
          <Text style={[styles.summaryTitle, { color: hex.textTertiary }]}>
            Today at a glance
          </Text>
          <View style={[styles.summaryRow, { borderBottomColor: hex.border }]}>
            <Text style={[styles.summaryLabel, { color: hex.textTertiary }]}>
              Completed time
            </Text>
            <Text style={[styles.summaryValue, { color: hex.text }]}>
              {formatDurationShort(todaySummary.completedMs)}
            </Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomColor: hex.border }]}>
            <Text style={[styles.summaryLabel, { color: hex.textTertiary }]}>
              Active now
            </Text>
            <Text style={[styles.summaryValue, { color: hex.text }]}>
              {todaySummary.activePunchIns > 0
                ? formatDurationShort(todaySummary.activeMs)
                : "No active session"}
            </Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomColor: hex.border }]}>
            <Text style={[styles.summaryLabel, { color: hex.textTertiary }]}>
              Punch-ins
            </Text>
            <Text style={[styles.summaryValue, { color: hex.text }]}>
              {todaySummary.activePunchIns > 0
                ? `${todaySummary.completedPunchIns} completed • ${todaySummary.activePunchIns} active`
                : todaySummary.completedPunchIns}
            </Text>
          </View>
          <View style={styles.summaryRowLast}>
            <Text style={[styles.summaryLabel, { color: hex.textTertiary }]}>
              Most time today
            </Text>
            <Text style={[styles.summaryValue, { color: hex.text }]}>
              {todaySummary.mostTimeToday || "—"}
            </Text>
          </View>
        </View>
      </ScrollView>

      <RolePickerModal
        visible={showRolePicker}
        onClose={() => setShowRolePicker(false)}
        onSelect={handleSelectFromPicker}
        roles={activeRoles}
        recentRoleIds={recentRoleIds}
        selectedRoleId={active?.roleId ?? selectedRoleId ?? undefined}
      />

      {confirmClockInRole && (
        <ConfirmDialog
          visible
          title="Punch in"
          message={`Continue to punch in to ${confirmClockInRole.name}?`}
          confirmLabel="Punch in"
          onCancel={() => setConfirmClockInRole(null)}
          onConfirm={onConfirmClockIn}
        />
      )}
      {confirmClockOut && active && (
        <ConfirmDialog
          visible
          title="Punch out"
          message={`Punch out of ${active.roleName}?`}
          confirmLabel="Punch out"
          onCancel={() => setConfirmClockOut(false)}
          onConfirm={onConfirmClockOut}
        />
      )}
    </EdgeToEdgeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
  },
  screenTitle: {
    ...TYPOGRAPHY.heroTitle,
    marginBottom: 20,
  },
  panel: {
    borderRadius: RADIUS.card,
    padding: 16,
    marginBottom: 18,
  },
  headerBlock: {
    marginBottom: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  greeting: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: 2,
    flexShrink: 1,
  },
  currentTime: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    opacity: 0.75,
    fontVariant: ["tabular-nums"],
  },
  currentDate: {
    fontSize: 13,
    marginTop: 2,
  },
  weatherBadge: {
    minWidth: 86,
    height: 28,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  weatherLabel: {
    fontSize: 12,
    fontWeight: "600",
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
  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    marginBottom: 2,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 12,
    opacity: 0.9,
  },
  recentSection: {
    marginTop: 4,
    marginBottom: 20,
  },
  sectionLabel: {
    ...TYPOGRAPHY.metadata,
    marginBottom: 8,
  },
  recentPills: {
    gap: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  summaryPanel: {
    borderRadius: RADIUS.card,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.75,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
  },
});

function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌡️";
}
