import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { useModalStore } from '@/stores/modal-store';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useEdgeToEdgeInsets } from '@/hooks/useEdgeToEdgeInsets';
import { getRoleById } from '@/db/roles';
import { getSessionsByRoleAndDateRange } from '@/db/sessions';
import { computeAnalytics, computeRoleTimeSeries } from '@/services/analytics';
import { RoleIcon } from '@/components/role-icon';
import { EdgeToEdgeScreen } from '@/components/screen-container';
import { ACCENT, RADIUS, TYPOGRAPHY } from '@/constants/designTokens';
import { formatDurationShort, formatTime, getDayLabel } from '@/utils/formatTime';
import {
  getRollingRange,
  getRollingRangeQueryBounds,
  type RollingRangePreset,
} from '@/utils/dateRanges';
import type { Role } from '@/types';
import type { SessionWithRole } from '@/types';

const MIN_ACTIVE_DAYS_FOR_CHART = 5;

/** "7:40 PM – 7:48 PM" */
function formatTimeRange(startAt: string, endAt: string | null): string {
  if (!endAt) return formatTime(startAt) + ' – —';
  return `${formatTime(startAt)} – ${formatTime(endAt)}`;
}

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Pick a y-axis max so the chart scales to the data (hours). Uses nice steps. */
function getNiceChartMax(maxBarValueHours: number): number {
  const NICE = [0.25, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  if (maxBarValueHours <= 0) return 0.5;
  const withHeadroom = Math.max(maxBarValueHours * 1.15, maxBarValueHours + 0.05);
  const found = NICE.find((n) => n >= withHeadroom);
  return found ?? (Math.ceil(withHeadroom) || 1);
}

type Period = '7d' | '30d';

function getPresetFromPeriod(period: Period): RollingRangePreset {
  return period === '7d' ? 'last7Days' : 'last30Days';
}

/** Start of current year and end of today (ISO). For YTD and range fetches. */
function getYearToDateRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** Total ms for completed sessions within [startIso, endIso). */
function totalMsInRange(
  sessions: SessionWithRole[],
  startIso: string,
  endIso: string
): number {
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  return sessions
    .filter((s) => {
      const t = new Date(s.startAt).getTime();
      return t >= startMs && t < endMs && s.endAt != null;
    })
    .reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
}

function OverviewRow({
  label,
  value,
  hex,
  last,
}: {
  label: string;
  value: string;
  hex: Record<string, string>;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: hex.border,
      }}
    >
      <Text style={{ fontSize: 14, color: hex.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '500', color: hex.text, fontVariant: ['tabular-nums'] as const }}>
        {value}
      </Text>
    </View>
  );
}

function refetchSessions(
  roleId: string,
  period: Period,
  setSessions: (s: SessionWithRole[]) => void,
  setSessionsForRanges: (s: SessionWithRole[]) => void
) {
  const selectedRange = getRollingRange(getPresetFromPeriod(period));
  const selectedBounds = getRollingRangeQueryBounds(selectedRange);
  getSessionsByRoleAndDateRange(roleId, selectedBounds.startIso, selectedBounds.endExclusiveIso).then(
    setSessions
  );
  const ytd = getYearToDateRange();
  getSessionsByRoleAndDateRange(roleId, ytd.start, ytd.end).then(setSessionsForRanges);
}

export default function RoleStatsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hex, bg } = useThemeColors();
  const { top: safeTop } = useEdgeToEdgeInsets();
  const router = useRouter();
  const { openSessionEditor, sessionEditorId } = useModalStore();
  const [role, setRole] = useState<Role | null | undefined>(undefined);
  const [sessions, setSessions] = useState<SessionWithRole[]>([]);
  const [sessionsForRanges, setSessionsForRanges] = useState<SessionWithRole[]>([]);
  const [period, setPeriod] = useState<Period>('7d');
  const prevSessionEditorId = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      getRoleById(id).then((r) => setRole(r ?? null));
      refetchSessions(id, period, setSessions, setSessionsForRanges);
    }, [id, period])
  );

  useEffect(() => {
    if (prevSessionEditorId.current !== null && sessionEditorId === null && id) {
      refetchSessions(id, period, setSessions, setSessionsForRanges);
    }
    prevSessionEditorId.current = sessionEditorId;
  }, [sessionEditorId, id, period]);

  const rangeTotals = useMemo(() => {
    const now = new Date();
    const last7 = getRollingRangeQueryBounds(getRollingRange('last7Days', now));
    const last30 = getRollingRangeQueryBounds(getRollingRange('last30Days', now));
    const last90 = getRollingRangeQueryBounds(getRollingRange('last90Days', now));
    const ytdStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const endExclusive = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    return {
      '7d': totalMsInRange(sessionsForRanges, last7.startIso, last7.endExclusiveIso),
      '30d': totalMsInRange(sessionsForRanges, last30.startIso, last30.endExclusiveIso),
      '90d': totalMsInRange(sessionsForRanges, last90.startIso, last90.endExclusiveIso),
      ytd: totalMsInRange(sessionsForRanges, ytdStart, endExclusive),
    };
  }, [sessionsForRanges]);

  const analytics = useMemo(() => computeAnalytics(sessions), [sessions]);
  const timeSeries = useMemo(() => computeRoleTimeSeries(sessions, period), [sessions, period]);

  // Chart data: use sessions (period fetch) when available so chart shows immediately; else use sessionsForRanges filtered to period
  const sessionsInPeriodFromRanges = useMemo(() => {
    const selectedRange = getRollingRange(getPresetFromPeriod(period));
    const selectedBounds = getRollingRangeQueryBounds(selectedRange);
    const startMs = new Date(selectedBounds.startIso).getTime();
    const endMs = new Date(selectedBounds.endExclusiveIso).getTime();
    return sessionsForRanges.filter((s) => {
      const t = new Date(s.startAt).getTime();
      return t >= startMs && t < endMs;
    });
  }, [sessionsForRanges, period]);

  const timeSeriesForChartFromRanges = useMemo(
    () => computeRoleTimeSeries(sessionsInPeriodFromRanges, period),
    [sessionsInPeriodFromRanges, period]
  );

  const barData = useMemo(() => {
    const series = sessions.length > 0 ? timeSeries : timeSeriesForChartFromRanges;
    return series.map((d) => {
      const xLabel = period === '30d' ? undefined : d.label;
      const item: { value: number; label?: string; frontColor: string; labelComponent?: () => React.ReactNode } = {
        value: Math.round((d.totalMs / 3600000) * 10) / 10,
        frontColor: role?.color ?? hex.text,
      };
      if (period === '7d' && xLabel) item.label = xLabel;
      if (period === '30d') item.labelComponent = () => <View style={{ width: 0, height: 0 }} />;
      return item;
    });
  }, [sessions.length, timeSeries, timeSeriesForChartFromRanges, period, role?.color, hex.text]);

  const monthlyAxisLabels = useMemo(() => {
    if (period !== '30d') return null;
    const series = sessions.length > 0 ? timeSeries : timeSeriesForChartFromRanges;
    if (series.length < 30) return null;
    const first = series[0];
    const mid = series[14];
    const last = series[29];
    const fmt = (dateKey: string) => {
      const [y, m, d] = dateKey.split('-').map(Number);
      const monthShort = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' });
      return `${monthShort} ${d}`;
    };
    return { left: fmt(first.dateKey), middle: mid.dateKey.slice(8, 10), right: fmt(last.dateKey) };
  }, [period, sessions.length, timeSeries, timeSeriesForChartFromRanges]);

  const chartYMax = useMemo(() => {
    const maxHours = barData.length ? Math.max(...barData.map((d) => d.value)) : 0;
    return getNiceChartMax(maxHours);
  }, [barData]);

  const seriesForChart = sessions.length > 0 ? timeSeries : timeSeriesForChartFromRanges;
  const activeDaysInPeriod = useMemo(
    () => seriesForChart.filter((d) => d.totalMs > 0).length,
    [seriesForChart]
  );
  const showChart = barData.length > 0 && activeDaysInPeriod >= MIN_ACTIVE_DAYS_FOR_CHART;
  const chartWidth = Dimensions.get('window').width - 80;

  const roleStat = analytics.roleStats[0];
  const totalMs = roleStat?.totalMs ?? 0;

  const selectedRange = useMemo(() => getRollingRange(getPresetFromPeriod(period)), [period]);
  const primaryStat = `${formatDurationShort(totalMs)} in ${selectedRange.label.toLowerCase()}`;

  const sessionsNewestFirst = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
    [sessions]
  );

  const { logSessions, zeroMinuteSessions, showCorrectionsToggle } = useMemo(() => {
    const getMs = (s: SessionWithRole) =>
      s.durationMs ?? (s.endAt ? new Date(s.endAt).getTime() - new Date(s.startAt).getTime() : 0);
    const zero: SessionWithRole[] = [];
    const main: SessionWithRole[] = [];
    for (const s of sessionsNewestFirst) {
      const ms = getMs(s);
      if (ms < 60_000) zero.push(s);
      else main.push(s);
    }
    return {
      logSessions: main,
      zeroMinuteSessions: zero,
      showCorrectionsToggle: zero.length > 0,
    };
  }, [sessionsNewestFirst]);

  const [showCorrections, setShowCorrections] = useState(false);
  const logSessionsToShow = showCorrections ? sessionsNewestFirst : logSessions;

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionWithRole[]>();
    for (const s of logSessionsToShow) {
      const key = toLocalDateKey(s.startAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return keys.map((key) => ({ dateKey: key, sessions: map.get(key)! }));
  }, [logSessionsToShow]);

  const mostRecentDayActive =
    sessionsNewestFirst.length > 0
      ? getDayLabel(sessionsNewestFirst[0].startAt)
      : null;

  const overviewRows: { label: string; value: string }[] = [];
  overviewRows.push({ label: 'Total time', value: formatDurationShort(totalMs) });
  if (role?.hourlyRate != null) {
    const hours = totalMs / 3_600_000;
    const estEarning = hours * role.hourlyRate;
    overviewRows.push({ label: 'Est. earning', value: `$${estEarning.toFixed(2)}` });
  }
  overviewRows.push({ label: 'Punch-ins', value: String(analytics.sessionCount) });
  if (roleStat && roleStat.sessionCount >= 2) {
    overviewRows.push({
      label: 'Average time in role',
      value: formatDurationShort(roleStat.avgSessionMs),
    });
  }
  const last7 = rangeTotals['7d'];
  const last30 = rangeTotals['30d'];
  overviewRows.push({
    label: getRollingRange('last7Days').label,
    value: formatDurationShort(last7),
  });
  overviewRows.push({
    label: getRollingRange('last30Days').label,
    value: formatDurationShort(last30),
  });
  if (mostRecentDayActive) {
    overviewRows.push({ label: 'Most recent day active', value: mostRecentDayActive });
  }

  if (!id) return null;
  if (role === undefined) {
    return (
      <EdgeToEdgeScreen>
        <View className={bg} style={{ flex: 1, paddingTop: safeTop + 20, padding: 20 }}>
          <Text style={{ ...TYPOGRAPHY.body, color: hex.textSecondary }}>Loading…</Text>
        </View>
      </EdgeToEdgeScreen>
    );
  }
  if (role === null) {
    return (
      <EdgeToEdgeScreen>
        <View className={bg} style={{ flex: 1, paddingTop: safeTop + 20, padding: 20 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <FontAwesome name="chevron-left" size={20} color={ACCENT.primary} />
          </TouchableOpacity>
          <Text style={{ ...TYPOGRAPHY.body, color: hex.textSecondary }}>
            This role may have been deleted.
          </Text>
        </View>
      </EdgeToEdgeScreen>
    );
  }

  return (
    <EdgeToEdgeScreen>
      <ScrollView
        className={bg}
        contentContainerStyle={{
          paddingTop: safeTop + 12,
          paddingBottom: 32,
          paddingHorizontal: 20,
        }}
      >
        {/* 1. Role detail header (back + icon + name) */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            marginBottom: 14,
            paddingVertical: 4,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 4, marginLeft: -4 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <FontAwesome name="chevron-left" size={20} color={ACCENT.primary} />
          </TouchableOpacity>
          <RoleIcon icon={role.icon} color={role.color} size={28} bgSize={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ ...TYPOGRAPHY.sectionTitle, color: hex.text }} numberOfLines={1}>
              {role.name}
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: hex.textSecondary,
                marginTop: 4,
                fontVariant: ['tabular-nums'] as const,
              }}
            >
              {primaryStat}
            </Text>
          </View>
        </View>

        {/* 2. Period selector — compact segmented control */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: hex.surface,
            borderRadius: RADIUS.sm,
            padding: 3,
            marginBottom: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: hex.border,
          }}
        >
          {(['7d', '30d'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: RADIUS.sm - 2,
                backgroundColor: period === p ? hex.elevated : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: period === p ? '600' : '500',
                  color: period === p ? hex.text : hex.textSecondary,
                  textAlign: 'center',
                }}
              >
                {p === '7d' ? '7 days' : '30 days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text
          style={{
            ...TYPOGRAPHY.metadata,
            color: hex.textTertiary,
            marginBottom: 16,
          }}
        >
          {selectedRange.label} · {selectedRange.displayRange}
        </Text>

        {/* 3. Trend section */}
        {sessions.length === 0 ? (
          <View
            style={{
              backgroundColor: hex.surface,
              borderRadius: RADIUS.card,
              padding: 24,
              marginBottom: 16,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: hex.border,
            }}
          >
            <Text style={{ ...TYPOGRAPHY.body, color: hex.textSecondary, textAlign: 'center' }}>
              No time in this role for {selectedRange.label.toLowerCase()}
            </Text>
            <Text
              style={{ fontSize: 14, color: hex.textTertiary, textAlign: 'center', marginTop: 6 }}
            >
              Punch in to {role.name} to see stats
            </Text>
          </View>
        ) : activeDaysInPeriod < MIN_ACTIVE_DAYS_FOR_CHART ? (
          <View
            style={{
              backgroundColor: hex.surface,
              borderRadius: RADIUS.card,
              padding: 24,
              marginBottom: 16,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: hex.border,
            }}
          >
            <Text style={{ ...TYPOGRAPHY.body, color: hex.textSecondary, textAlign: 'center' }}>
              Not enough time yet for a {selectedRange.shortLabel} trend
            </Text>
            <Text
              style={{ fontSize: 14, color: hex.textTertiary, textAlign: 'center', marginTop: 6 }}
            >
              Punch into this role across a few days to see the pattern
            </Text>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: hex.surface,
              borderRadius: RADIUS.card,
              padding: 16,
              marginBottom: 16,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: hex.border,
            }}
          >
            <BarChart
              data={barData}
              parentWidth={chartWidth}
              adjustToWidth
              roundedTop
              roundedBottom
              maxValue={chartYMax}
              noOfSections={3}
              showFractionalValues
              roundToDigits={2}
              minHeight={4}
              height={140}
              yAxisThickness={0}
              xAxisThickness={0}
              yAxisTextStyle={{ color: hex.textTertiary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: hex.textTertiary, fontSize: 10 }}
              hideRules
              barBorderRadius={6}
              isAnimated={false}
            />
            {period === '30d' && monthlyAxisLabels && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingLeft: 36,
                  paddingRight: 8,
                  marginTop: 4,
                }}
              >
                <Text style={{ fontSize: 10, color: hex.textTertiary }}>{monthlyAxisLabels.left}</Text>
                <Text style={{ fontSize: 10, color: hex.textTertiary }}>{monthlyAxisLabels.middle}</Text>
                <Text style={{ fontSize: 10, color: hex.textTertiary }}>{monthlyAxisLabels.right}</Text>
              </View>
            )}
          </View>
        )}

        {/* 4. Overview — single card */}
        {sessions.length > 0 && (
          <View
            style={{
              backgroundColor: hex.surface,
              borderRadius: RADIUS.card,
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 4,
              marginBottom: 16,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: hex.border,
            }}
          >
            <Text
              style={{
                ...TYPOGRAPHY.metadata,
                color: hex.textTertiary,
                marginBottom: 10,
              }}
            >
              Overview
            </Text>
            {overviewRows.map((row, i) => (
              <OverviewRow
                key={row.label}
                label={row.label}
                value={row.value}
                hex={hex}
                last={i === overviewRows.length - 1}
              />
            ))}
          </View>
        )}

        {/* 5. Role log — grouped by day */}
        {sessions.length > 0 && (
          <View
            style={{
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                ...TYPOGRAPHY.metadata,
                color: hex.textTertiary,
                marginBottom: 10,
                paddingHorizontal: 2,
              }}
            >
              Role log
            </Text>
            {sessionsByDay.length === 0 && !showCorrectionsToggle ? null : sessionsByDay.length === 0 && showCorrectionsToggle ? (
              <View style={{ paddingVertical: 12 }}>
                <Text style={{ fontSize: 14, color: hex.textSecondary }}>
                  All entries are corrections (0m). Toggle below to show.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {sessionsByDay.map(({ dateKey, sessions: daySessions }) => {
                  const dayLabel = (() => {
                    const iso = daySessions[0]?.startAt ?? '';
                    const d = new Date(iso);
                    const today = new Date();
                    if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear())
                      return 'Today';
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear())
                      return 'Yesterday';
                    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                  })();
                  return (
                    <View key={dateKey}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: hex.textTertiary,
                          textTransform: 'uppercase',
                          letterSpacing: 0.4,
                          marginBottom: 6,
                          paddingHorizontal: 2,
                        }}
                      >
                        {dayLabel}
                      </Text>
                      <View
                        style={{
                          backgroundColor: hex.surface,
                          borderRadius: RADIUS.card,
                          overflow: 'hidden',
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: hex.border,
                        }}
                      >
                        {daySessions.map((s) => {
                          const durationMs =
                            s.durationMs ??
                            (s.endAt ? new Date(s.endAt).getTime() - new Date(s.startAt).getTime() : 0);
                          const duration = formatDurationShort(durationMs);
                          const isLastInDay = daySessions.indexOf(s) === daySessions.length - 1;
                          const hasNote = s.notes != null && s.notes.trim() !== '';
                          return (
                            <TouchableOpacity
                              key={s.id}
                              onPress={() =>
                                openSessionEditor(s.id)
                              }
                              activeOpacity={0.7}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingVertical: 12,
                                paddingHorizontal: 14,
                                borderBottomWidth: isLastInDay ? 0 : StyleSheet.hairlineWidth,
                                borderBottomColor: hex.border,
                              }}
                            >
                              <View style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                                <Text
                                  style={{ fontSize: 15, color: hex.text }}
                                  numberOfLines={1}
                                >
                                  {formatTimeRange(s.startAt, s.endAt)}
                                </Text>
                                {hasNote && (
                                  <Text
                                    style={{
                                      fontSize: 13,
                                      color: hex.textTertiary,
                                      marginTop: 2,
                                    }}
                                    numberOfLines={2}
                                  >
                                    {s.notes!.trim()}
                                  </Text>
                                )}
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text
                                  style={{
                                    fontSize: 15,
                                    fontWeight: '600',
                                    color: hex.textSecondary,
                                    fontVariant: ['tabular-nums'] as const,
                                  }}
                                >
                                  {duration}
                                </Text>
                                <Ionicons name="create-outline" size={18} color={hex.textTertiary} />
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {showCorrectionsToggle && (
              <TouchableOpacity
                onPress={() => setShowCorrections((v) => !v)}
                style={{
                  marginTop: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: RADIUS.sm,
                  backgroundColor: hex.surface,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: hex.border,
                }}
              >
                <Text style={{ fontSize: 13, color: hex.textTertiary }}>
                  {showCorrections
                    ? 'Hide corrections'
                    : `${zeroMinuteSessions.length} correction${zeroMinuteSessions.length === 1 ? '' : 's'} (0m)`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </EdgeToEdgeScreen>
  );
}

