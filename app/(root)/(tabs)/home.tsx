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
  Animated,
  Easing,
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
import { EdgeToEdgeScreen } from "@/components/screen-container";
import { RoleIcon } from "@/components/role-icon";
import { RADIUS, TYPOGRAPHY, SPACING } from "@/constants/designTokens";
import { ACCENT } from "@/constants/colors";
import { formatDurationShort } from "@/utils/formatTime";
import {
  deriveHomeSummaryRows,
  deriveHomeTodaySummary,
  deriveInactiveHomeCardCopy,
  resolveLastEngagedRole,
} from "@/utils/activeSession";
import { getSetting, setSetting } from "@/db/settings";
import { getLastEngagedRoleId } from "@/db/sessions";
import type { Role } from "@/types";

const WEATHER_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
let weatherCache: {
  weather: {
    temperature: number;
    weatherCode: number;
  } | null;
  locationName: string | null;
  tempUnit: "C" | "F";
  fetchedAtMs: number;
} | null = null;

export default function HomeScreen() {
  const router = useRouter();
  const { hex, bg } = useThemeColors();
  const { tabBarHeight, top } = useEdgeToEdgeInsets();
  const { roles, loading: rolesLoading } = useRoles();
  const { sessions: todaySessions, refresh: refreshSessions } =
    useTodaySessions();
  const {
    active,
    hydrateActiveSessionFromDatabase,
    isHydratingActiveSession,
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
  const [confirmQuickSwitchRole, setConfirmQuickSwitchRole] =
    useState<Role | null>(null);
  const [confirmClockOut, setConfirmClockOut] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<{
    temperature: number;
    weatherCode: number;
  } | null>(weatherCache?.weather ?? null);
  const [weatherLocationName, setWeatherLocationName] = useState<string | null>(
    weatherCache?.locationName ?? null,
  );
  const [weatherTempUnit, setWeatherTempUnit] = useState<"C" | "F">(
    weatherCache?.tempUnit ?? "C",
  );
  const [weatherLoading, setWeatherLoading] = useState(weatherCache == null);
  const activeRoles = roles.filter((r) => !r.isArchived);
  const clockTickAnim = useState(() => new Animated.Value(0))[0];
  const currentTimeText = useMemo(
    () =>
      now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [now],
  );

  const loadLastEngagedRole = useCallback(async () => {
    const savedRoleId = await getSetting("last_engaged_role_id");
    const fallbackRoleId =
      savedRoleId || (await getLastEngagedRoleId()) || null;
    setLastEngagedRoleId(fallbackRoleId);
  }, []);

  const refreshHomeData = useCallback(() => {
    refreshSessions();
    hydrateActiveSessionFromDatabase();
    loadLastEngagedRole();
  }, [refreshSessions, hydrateActiveSessionFromDatabase, loadLastEngagedRole]);

  const fetchWeather = useCallback(
    async (force = false) => {
      if (
        !force &&
        weatherCache != null &&
        Date.now() - weatherCache.fetchedAtMs < WEATHER_REFRESH_INTERVAL_MS
      ) {
        setWeather(weatherCache.weather);
        setWeatherLocationName(weatherCache.locationName);
        setWeatherTempUnit(weatherCache.tempUnit);
        setWeatherLoading(false);
        return;
      }
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
          const nextWeather = {
            temperature: Math.round(weatherJson.current.temperature_2m),
            weatherCode: weatherJson.current.weather_code,
          };
          const nextLocationName =
            savedLabel.trim().length > 0 ? savedLabel.trim() : null;
          setWeather({
            temperature: nextWeather.temperature,
            weatherCode: nextWeather.weatherCode,
          });
          setWeatherLocationName(nextLocationName);
          weatherCache = {
            weather: nextWeather,
            locationName: nextLocationName,
            tempUnit: unit,
            fetchedAtMs: Date.now(),
          };
        } else {
          setWeather(null);
          weatherCache = {
            weather: null,
            locationName: null,
            tempUnit: unit,
            fetchedAtMs: Date.now(),
          };
        }
      } catch {
        setWeather(null);
        weatherCache = {
          weather: null,
          locationName: null,
          tempUnit: weatherTempUnit,
          fetchedAtMs: Date.now(),
        };
      } finally {
        setWeatherLoading(false);
      }
    },
    [weatherTempUnit],
  );

  useEffect(() => {
    refreshHomeData();
  }, [refreshHomeData]);

  useFocusEffect(
    useCallback(() => {
      refreshHomeData();
    }, [refreshHomeData]),
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
    if (
      !rolesLoading &&
      activeRoles.length > 0 &&
      active &&
      !activeRoles.some((r) => r.id === active.roleId)
    ) {
      clearSessionStore();
    }
  }, [active, activeRoles, clearSessionStore, rolesLoading]);

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    clockTickAnim.setValue(0);
    Animated.timing(clockTickAnim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [currentTimeText, clockTickAnim]);

  useEffect(() => {
    void fetchWeather();
    const intervalId = setInterval(() => {
      void fetchWeather();
    }, WEATHER_REFRESH_INTERVAL_MS);
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
    ? (activeRoles.find((r) => r.id === selectedRoleId) ?? null)
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
      setConfirmQuickSwitchRole(role);
    } else {
      setSelectedRoleId(role.id);
      confirmAndClockIn(role);
    }
  };

  const onConfirmQuickSwitchRole = async () => {
    if (!confirmQuickSwitchRole) return;
    setSelectedRoleId(confirmQuickSwitchRole.id);
    await switchRole(confirmQuickSwitchRole.id).then(refreshSessions);
    setConfirmQuickSwitchRole(null);
  };

  const showRecentRoles = recentRoleIds.length >= 2;
  const isInitialHomeHydrationPending = isHydratingActiveSession && !active;
  const activeNowLabel =
    todaySummary.activePunchIns > 0
      ? todaySummary.activeMs < 60_000
        ? "Less than 1m"
        : formatDurationShort(todaySummary.activeMs)
      : "No active session";
  const inactiveTargetRole = lastEngagedRole ?? selectedRole;
  const inactiveCardCopy = useMemo(
    () =>
      deriveInactiveHomeCardCopy({
        lastEngagedRole,
        selectedRole,
        summary: todaySummary,
      }),
    [lastEngagedRole, selectedRole, todaySummary],
  );
  const todaySummaryRows = useMemo(
    () =>
      deriveHomeSummaryRows({
        summary: todaySummary,
        hasActiveSession: active != null,
        activeNowLabel,
      }),
    [todaySummary, active, activeNowLabel],
  );
  const homeBottomPadding = tabBarHeight + SPACING.md;

  return (
    <EdgeToEdgeScreen style={{ flex: 1 }}>
      <ScrollView
        className={bg}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: top + SPACING.sm,
            paddingBottom: homeBottomPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.headerCard,
            { backgroundColor: hex.elevated, borderColor: hex.border },
          ]}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.headerContextBlock}>
              <Text style={[styles.greeting, { color: hex.text }]}>
                {now.getHours() < 12
                  ? "Good morning"
                  : now.getHours() < 18
                    ? "Good afternoon"
                    : "Good evening"}
              </Text>
              <Text style={[styles.currentDate, { color: hex.textSecondary }]}>
                {now.toLocaleDateString([], {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.timeBlock}>
              <Text style={[styles.timeLabel, { color: hex.textTertiary }]}>
                Local time
              </Text>
              <Animated.Text
                style={[
                  styles.currentTime,
                  {
                    color: hex.text,
                    opacity: clockTickAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.72, 1],
                    }),
                    transform: [
                      {
                        scale: clockTickAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.985, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {currentTimeText}
              </Animated.Text>
            </View>
          </View>
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
        </View>

        {isInitialHomeHydrationPending ? (
          <View
            style={[
              styles.panel,
              styles.sectionBlock,
              {
                backgroundColor: hex.elevated,
                borderColor: hex.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: hex.text }]}>
              Restoring active session
            </Text>
            <Text style={[styles.helperText, { color: hex.textSecondary }]}>
              Checking for an unfinished role session...
            </Text>
            <ActivityIndicator size="small" color={hex.textSecondary} />
          </View>
        ) : active ? (
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
          <View
            style={[
              styles.panel,
              styles.sectionBlock,
              {
                backgroundColor: hex.elevated,
                borderColor: hex.border,
              },
            ]}
          >
            <Text style={[styles.statusEyebrow, { color: hex.textSecondary }]}>
              {inactiveCardCopy.kicker}
            </Text>
            <View style={styles.readyHeader}>
              {inactiveTargetRole ? (
                <RoleIcon
                  icon={inactiveTargetRole.icon}
                  color={inactiveTargetRole.color}
                  size={14}
                  bgSize={34}
                />
              ) : null}
              <View style={styles.readyTitleBlock}>
                <Text style={[styles.readyRoleName, { color: hex.text }]}>
                  {inactiveCardCopy.roleName}
                </Text>
                <Text
                  style={[styles.readyStatusLine, { color: hex.textSecondary }]}
                >
                  {inactiveCardCopy.statusLine}
                </Text>
              </View>
            </View>
            <Text style={[styles.helperText, { color: hex.textSecondary }]}>
              {inactiveCardCopy.contextLine}
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
                {inactiveCardCopy.ctaLabel}
              </Text>
            </TouchableOpacity>
            {inactiveCardCopy.showChooseAnother ? (
              <TouchableOpacity
                onPress={() => setShowRolePicker(true)}
                style={styles.secondaryAction}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.secondaryActionLabel,
                    { color: ACCENT.primary },
                  ]}
                >
                  Choose another role
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {showRecentRoles && (
          <View style={styles.recentSection}>
            <Text style={[styles.sectionLabel, { color: hex.textTertiary }]}>
              Quick start
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
                        borderWidth: 1,
                        borderColor: `${role.color}66`,
                        backgroundColor: `${role.color}20`,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <RoleIcon
                      icon={role.icon}
                      color={role.color}
                      size={12}
                      bgSize={22}
                      showBg={false}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.pillLabel,
                        { color: isActiveRole ? role.color : hex.text },
                      ]}
                    >
                      {role.name}
                    </Text>
                    {isActiveRole ? (
                      <View
                        style={[
                          styles.activePillDot,
                          { backgroundColor: role.color },
                        ]}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View
          style={[
            styles.summaryPanel,
            styles.sectionBlock,
            { backgroundColor: hex.elevated, borderColor: hex.border },
          ]}
        >
          <Text style={[styles.summaryTitle, { color: hex.textSecondary }]}>
            Today at a glance
          </Text>
          {todaySummaryRows.map((row, index) => {
            const isLast = index === todaySummaryRows.length - 1;
            return (
              <View
                key={row.label}
                style={[
                  isLast ? styles.summaryRowLast : styles.summaryRow,
                  !isLast && { borderBottomColor: hex.border },
                ]}
              >
                <Text
                  style={[styles.summaryLabel, { color: hex.textTertiary }]}
                >
                  {row.label}
                </Text>
                <Text
                  style={[
                    row.emphasize
                      ? styles.summaryValueStrong
                      : styles.summaryValue,
                    { color: hex.text },
                  ]}
                >
                  {row.value}
                </Text>
              </View>
            );
          })}
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(root)/logs")}
          style={[
            styles.logsRow,
            { backgroundColor: hex.elevated, borderColor: hex.border },
          ]}
          activeOpacity={0.75}
        >
          <View style={styles.logsRowLeft}>
            <View
              style={[
                styles.logsGlyphWrap,
                { backgroundColor: `${ACCENT.primary}1f` },
              ]}
            >
              <Text style={[styles.logsGlyph, { color: ACCENT.primary }]}>
                ↗
              </Text>
            </View>
            <View>
              <Text style={[styles.logsRowTitle, { color: hex.text }]}>
                View all logs
              </Text>
              <Text
                style={[styles.logsRowSubtitle, { color: hex.textSecondary }]}
              >
                Review entries and edits
              </Text>
            </View>
          </View>
          <Text style={[styles.logsChevron, { color: hex.textTertiary }]}>
            ›
          </Text>
        </TouchableOpacity>
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
      {confirmQuickSwitchRole && active && (
        <ConfirmDialog
          visible
          title="Switch role"
          message={`Switch from ${active.roleName} to ${confirmQuickSwitchRole.name}?`}
          confirmLabel="Switch role"
          onCancel={() => setConfirmQuickSwitchRole(null)}
          onConfirm={onConfirmQuickSwitchRole}
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
    borderWidth: 1,
  },
  sectionBlock: {
    marginBottom: 12,
  },
  headerCard: {
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: RADIUS.card,
    borderWidth: 1,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerContextBlock: {
    flex: 1,
    paddingTop: 1,
  },
  greeting: {
    ...TYPOGRAPHY.cardTitle,
    fontSize: 18,
    lineHeight: 23,
    marginBottom: 2,
    flexShrink: 1,
  },
  timeBlock: {
    alignItems: "flex-end",
    minWidth: 112,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  currentTime: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    fontVariant: ["tabular-nums"],
  },
  currentDate: {
    fontSize: 12,
    lineHeight: 16,
  },
  weatherBadge: {
    minHeight: 24,
    marginTop: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "flex-start",
    justifyContent: "center",
    alignSelf: "flex-start",
    maxWidth: "92%",
  },
  weatherLabel: {
    fontSize: 11,
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
    marginBottom: 4,
  },
  statusEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  readyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  readyTitleBlock: {
    flex: 1,
  },
  readyRoleName: {
    fontSize: 21,
    fontWeight: "700",
    lineHeight: 26,
  },
  readyStatusLine: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.9,
  },
  helperText: {
    fontSize: 13,
    marginBottom: 12,
    opacity: 0.9,
  },
  recentSection: {
    marginTop: 0,
    marginBottom: 12,
  },
  sectionLabel: {
    ...TYPOGRAPHY.metadata,
    marginBottom: 8,
  },
  recentPills: {
    gap: 8,
    paddingRight: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: RADIUS.pill,
    maxWidth: 176,
  },
  activePillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },
  summaryPanel: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.75,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    paddingLeft: 12,
    textAlign: "right",
    flexShrink: 1,
  },
  summaryValueStrong: {
    fontSize: 17,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    paddingLeft: 12,
    textAlign: "right",
    flexShrink: 1,
  },
  logsRow: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  logsGlyphWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logsGlyph: {
    fontSize: 13,
    fontWeight: "700",
  },
  logsRowTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  logsRowSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  logsChevron: {
    fontSize: 24,
    lineHeight: 24,
    marginLeft: 8,
  },
  viewLogsLink: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  viewLogsLinkText: {
    fontSize: 14,
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
