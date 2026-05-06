import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useEdgeToEdgeInsets } from '@/hooks/useEdgeToEdgeInsets';
import { computeAnalytics } from '@/services/analytics';
import { hasEnoughDataForInsights } from '@/services/insights';
import { OverlayHeader } from '@/components/overlay-header';
import { EdgeToEdgeScreen } from '@/components/screen-container';
import { RADIUS, TYPOGRAPHY } from '@/constants/designTokens';
import { formatDurationShort } from '@/utils/formatTime';
import { getSessionsByDateRange } from '@/db/sessions';
import type { SessionWithRole } from '@/types';

type Period = '7d' | '30d' | '90d';

function getDateRange(period: Period): { start: string; end: string } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function StatsScreen() {
  const { hex, bg } = useThemeColors();
  const { tabBarHeight, overlayHeaderHeight } = useEdgeToEdgeInsets();
  const [period, setPeriod] = useState<Period>('7d');
  const [sessions, setSessions] = useState<SessionWithRole[]>([]);
  const refreshStatsData = useCallback(() => {
    const { start, end } = getDateRange(period);
    getSessionsByDateRange(start, end).then(setSessions);
  }, [period]);

  useEffect(() => {
    refreshStatsData();
  }, [refreshStatsData]);

  useFocusEffect(
    useCallback(() => {
      refreshStatsData();
    }, [refreshStatsData])
  );

  useEffect(() => {
    let lastAppState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const isReturningToForeground = lastAppState.match(/inactive|background/) && nextAppState === 'active';
      if (isReturningToForeground) {
        refreshStatsData();
      }
      lastAppState = nextAppState;
    });

    return () => subscription.remove();
  }, [refreshStatsData]);

  const analytics = useMemo(() => computeAnalytics(sessions), [sessions]);
  const enoughForInsights = hasEnoughDataForInsights(sessions);
  const completedCount = sessions.filter((s) => s.endAt != null).length;
  const hasMultipleRoles = analytics.roleStats.length >= 2;
  const totalMs = analytics.totalMs || 1;

  return (
    <EdgeToEdgeScreen
      style={{ flex: 1 }}
      overlay={<OverlayHeader title="Insights" />}
    >
      <ScrollView
        className={bg}
        contentContainerStyle={{
          paddingTop: overlayHeaderHeight + 16,
          paddingBottom: tabBarHeight + 32,
          paddingHorizontal: 20,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderRadius: RADIUS.pill,
                backgroundColor: period === p ? `${hex.text}12` : 'transparent',
                borderWidth: 1,
                borderColor: period === p ? hex.border : hex.border,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: period === p ? '600' : '400',
                  color: period === p ? hex.text : hex.textSecondary,
                }}
              >
                {p === '7d' ? '7 days' : p === '30d' ? '30 days' : '90 days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {completedCount === 0 ? (
          <View
            style={{
              backgroundColor: hex.surface,
              borderRadius: RADIUS.card,
              padding: 28,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: hex.border,
            }}
          >
            <Text
              style={{
                ...TYPOGRAPHY.body,
                color: hex.textSecondary,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Not enough time yet for trends
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: hex.textTertiary,
                textAlign: 'center',
              }}
            >
              Keep punching in across a few days to unlock richer insights.
            </Text>
          </View>
        ) : !enoughForInsights ? (
          <View
            style={{
              backgroundColor: hex.surface,
              borderRadius: RADIUS.card,
              padding: 28,
              borderWidth: 1,
              borderColor: hex.border,
            }}
          >
            <Text
              style={{
                ...TYPOGRAPHY.body,
                color: hex.textSecondary,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Not enough time yet for trends
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: hex.textTertiary,
                textAlign: 'center',
              }}
            >
              Punch in at least 3 times to see insights
            </Text>
            <View style={{ marginTop: 20, gap: 8 }}>
              <StatRow label="Time lived" value={formatDurationShort(analytics.totalMs)} hex={hex} />
            </View>
          </View>
        ) : (
          <>
            {/* Hero */}
            <View
              style={{
                backgroundColor: hex.surface,
                borderRadius: RADIUS.card,
                padding: 24,
                marginBottom: 20,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: hex.border,
              }}
            >
              <Text
                style={{
                  ...TYPOGRAPHY.metadata,
                  color: hex.textTertiary,
                  marginBottom: 12,
                }}
              >
                Total time
              </Text>
              <Text style={{ fontSize: 28, fontWeight: '700', color: hex.text }}>
                {formatDurationShort(analytics.totalMs)}
              </Text>
            </View>

            {/* Time by role — only when multiple roles (avoid over-visualizing small data) */}
            {hasMultipleRoles && (
              <View
                style={{
                  backgroundColor: hex.surface,
                  borderRadius: RADIUS.card,
                  padding: 20,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: hex.border,
                }}
              >
                <Text
                  style={{
                    ...TYPOGRAPHY.metadata,
                    color: hex.textTertiary,
                    marginBottom: 14,
                  }}
                >
                  Time by role
                </Text>
                {analytics.roleStats.map((r, idx) => {
                  const pct = totalMs > 0 ? (r.totalMs / totalMs) * 100 : 0;
                  const isLast = idx === analytics.roleStats.length - 1;
                  return (
                    <View
                      key={r.roleId}
                      style={{
                        marginBottom: isLast ? 0 : 14,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{ fontSize: 14, color: hex.text }}
                          numberOfLines={1}
                        >
                          {r.roleName}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: hex.textSecondary }}>
                          {formatDurationShort(r.totalMs)}
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: hex.border,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${Math.max(2, pct)}%`,
                            borderRadius: 3,
                            backgroundColor: r.roleColor,
                            opacity: 0.85,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Summary — only rows that add value */}
            <View
              style={{
                backgroundColor: hex.surface,
                borderRadius: RADIUS.card,
                padding: 20,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: hex.border,
              }}
            >
              <Text
                style={{
                  ...TYPOGRAPHY.metadata,
                  color: hex.textTertiary,
                  marginBottom: 12,
                }}
              >
                Summary
              </Text>
              <StatRow
                label="Time lived"
                value={formatDurationShort(analytics.totalMs)}
                hex={hex}
              />
              <StatRow
                label="Times punched in"
                value={String(analytics.sessionCount)}
                hex={hex}
              />
              {analytics.sessionCount >= 2 && (
                <StatRow
                  label="Average time in role"
                  value={formatDurationShort(analytics.avgSessionMs)}
                  hex={hex}
                />
              )}
              {analytics.longestSessionMs > 0 && (
                <StatRow
                  label="Longest stretch"
                  value={formatDurationShort(analytics.longestSessionMs)}
                  hex={hex}
                />
              )}
              {analytics.mostFrequentRole &&
                analytics.roleStats[0] &&
                analytics.roleStats[0].totalMs >= 5 * 60000 && (
                  <StatRow
                    label="Most time in"
                    value={analytics.mostFrequentRole}
                    hex={hex}
                  />
                )}
            </View>

            {/* Low-data nudge — when we have insights but only one role or very little variety */}
            {enoughForInsights && !hasMultipleRoles && (
              <Text
                style={{
                  fontSize: 13,
                  color: hex.textTertiary,
                  textAlign: 'center',
                  marginBottom: 24,
                  paddingHorizontal: 16,
                }}
              >
                Keep punching in across a few days to unlock richer insights.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </EdgeToEdgeScreen>
  );
}

function StatRow({
  label,
  value,
  hex,
}: {
  label: string;
  value: string;
  hex: Record<string, string>;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: hex.border,
      }}
    >
      <Text style={{ fontSize: 14, color: hex.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '500', color: hex.text }}>{value}</Text>
    </View>
  );
}
