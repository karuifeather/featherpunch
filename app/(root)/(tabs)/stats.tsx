import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppState,
  AppStateStatus,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useEdgeToEdgeInsets } from "@/hooks/useEdgeToEdgeInsets";
import {
  computeAnalytics,
  getPreviousRollingRange,
} from "@/services/analytics";
import { hasEnoughDataForTrends } from "@/services/insights";
import { OverlayHeader } from "@/components/overlay-header";
import { EdgeToEdgeScreen } from "@/components/screen-container";
import { RoleIcon } from "@/components/role-icon";
import { RADIUS, TYPOGRAPHY } from "@/constants/designTokens";
import { formatDurationShort } from "@/utils/formatTime";
import {
  getRollingRange,
  getRollingRangeQueryBounds,
  type RollingRangePreset,
} from "@/utils/dateRanges";
import {
  getActiveSession,
  getCompletedSessionLogs,
  getSessionsByDateRange,
} from "@/db/sessions";
import type { SessionLogEntry, SessionWithRole } from "@/types";
import {
  INSIGHT_THRESHOLDS,
  buildRoleComparisonRows,
  deriveChangeExplanation,
  deriveEarningsInsight,
  deriveInsightsEmptyState,
  deriveKeyTakeaway,
  derivePatternInsights,
  formatInsightsRangeLabel,
  getTotalComparisonCopy,
  getSessionComparisonCopy,
} from "@/utils/insightsPresentation";

type Period = "7d" | "30d" | "90d";

function getPresetFromPeriod(period: Period): RollingRangePreset {
  if (period === "7d") return "last7Days";
  if (period === "30d") return "last30Days";
  return "last90Days";
}

export default function StatsScreen() {
  const { hex, bg } = useThemeColors();
  const { tabBarHeight, overlayHeaderHeight } = useEdgeToEdgeInsets();
  const [period, setPeriod] = useState<Period>("7d");
  const [sessionsInRange, setSessionsInRange] = useState<SessionWithRole[]>([]);
  const [previousSessions, setPreviousSessions] = useState<SessionWithRole[]>(
    [],
  );
  const [lastCompletedSession, setLastCompletedSession] =
    useState<SessionLogEntry | null>(null);
  const [activeSession, setActiveSession] = useState<SessionWithRole | null>(
    null,
  );

  const refreshStatsData = useCallback(async () => {
    const range = getRollingRange(getPresetFromPeriod(period));
    const bounds = getRollingRangeQueryBounds(range);
    const previousBounds = getPreviousRollingRange(period);
    const [current, previous, recentCompleted, active] = await Promise.all([
      getSessionsByDateRange(bounds.startIso, bounds.endExclusiveIso),
      getSessionsByDateRange(
        previousBounds.startIso,
        previousBounds.endExclusiveIso,
      ),
      getCompletedSessionLogs({ limit: 1 }),
      getActiveSession(),
    ]);
    setSessionsInRange(current);
    setPreviousSessions(previous);
    setLastCompletedSession(recentCompleted[0] ?? null);
    setActiveSession(active);
  }, [period]);

  useEffect(() => {
    refreshStatsData();
  }, [refreshStatsData]);

  useFocusEffect(
    useCallback(() => {
      refreshStatsData();
    }, [refreshStatsData]),
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
          refreshStatsData();
        }
        lastAppState = nextAppState;
      },
    );

    return () => subscription.remove();
  }, [refreshStatsData]);

  const analytics = useMemo(
    () => computeAnalytics(sessionsInRange),
    [sessionsInRange],
  );
  const previousAnalytics = useMemo(
    () => computeAnalytics(previousSessions),
    [previousSessions],
  );
  const hasTrendData = hasEnoughDataForTrends(sessionsInRange);
  const selectedCompleted = sessionsInRange.filter((s) => s.endAt != null);
  const hasAnyCompletedHistory = lastCompletedSession != null;
  const selectedRange = useMemo(
    () => getRollingRange(getPresetFromPeriod(period)),
    [period],
  );
  const selectedRangeLabel = selectedRange.label;
  const rangeLabel = formatInsightsRangeLabel(selectedRange);
  const emptyState = deriveInsightsEmptyState({
    selectedRangeLabel,
    selectedCompletedCount: analytics.sessionCount,
    totalCompletedCount: hasAnyCompletedHistory ? 1 : 0,
    lastCompleted: lastCompletedSession,
  });
  const comparisonSummary = getTotalComparisonCopy(
    analytics.totalMs,
    previousAnalytics.totalMs,
    selectedRange.shortLabel,
  );
  const sessionsComparison = getSessionComparisonCopy(
    analytics.sessionCount,
    previousAnalytics.sessionCount,
    selectedRange.shortLabel,
  );
  const roleComparisonRows = useMemo(
    () =>
      buildRoleComparisonRows({
        currentRoleStats: analytics.roleStats,
        previousRoleStats: previousAnalytics.roleStats,
        totalCurrentMs: analytics.totalMs,
        totalPreviousMs: previousAnalytics.totalMs,
        rangeShortLabel: selectedRange.shortLabel,
      }),
    [analytics, previousAnalytics, selectedRange.shortLabel],
  );
  const changeExplanation = useMemo(
    () =>
      deriveChangeExplanation({
        currentTotalMs: analytics.totalMs,
        previousTotalMs: previousAnalytics.totalMs,
        currentSessionCount: analytics.sessionCount,
        previousSessionCount: previousAnalytics.sessionCount,
        currentAvgSessionMs: analytics.avgSessionMs,
        previousAvgSessionMs: previousAnalytics.avgSessionMs,
        currentRoleStats: analytics.roleStats,
        previousRoleStats: previousAnalytics.roleStats,
        rangeShortLabel: selectedRange.shortLabel,
      }),
    [analytics, previousAnalytics, selectedRange.shortLabel],
  );
  const keyTakeaway = useMemo(
    () =>
      deriveKeyTakeaway({
        currentTotalMs: analytics.totalMs,
        previousTotalMs: previousAnalytics.totalMs,
        currentSessionCount: analytics.sessionCount,
        currentTopRole: analytics.topRoleByDuration,
        currentRangeLabel: selectedRange.label,
        currentRangeShortLabel: selectedRange.shortLabel,
        lastCompleted: lastCompletedSession,
      }),
    [analytics, previousAnalytics, selectedRange, lastCompletedSession],
  );
  const patternInsights = useMemo(
    () => derivePatternInsights(sessionsInRange),
    [sessionsInRange],
  );
  const earningsInsight = useMemo(
    () => deriveEarningsInsight(sessionsInRange),
    [sessionsInRange],
  );
  const activeNote =
    activeSession == null
      ? null
      : `${activeSession.roleName} · ${formatDurationShort(Date.now() - new Date(activeSession.startAt).getTime())} active`;

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
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
          {(["7d", "30d", "90d"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderRadius: RADIUS.pill,
                backgroundColor: period === p ? `${hex.text}12` : "transparent",
                borderWidth: 1,
                borderColor: period === p ? hex.border : hex.border,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: period === p ? "600" : "400",
                  color: period === p ? hex.text : hex.textSecondary,
                }}
              >
                {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
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
          {rangeLabel}
        </Text>

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
              marginBottom: 10,
            }}
          >
            {selectedRange.label}
          </Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "700",
              color: hex.text,
              marginBottom: 8,
            }}
          >
            {formatDurationShort(analytics.totalMs)}
          </Text>
          <Text
            style={{ fontSize: 14, color: hex.textSecondary, marginBottom: 4 }}
          >
            Total tracked
          </Text>
          <Text style={{ fontSize: 14, color: hex.textSecondary }}>
            {analytics.sessionCount} completed session
            {analytics.sessionCount === 1 ? "" : "s"} ·{" "}
            {analytics.roleStats.length} active role
            {analytics.roleStats.length === 1 ? "" : "s"}
          </Text>
          <Text
            style={{ fontSize: 14, color: hex.textSecondary, marginTop: 4 }}
          >
            Top role: {analytics.topRoleByDuration?.roleName ?? "None"}
          </Text>
          <Text style={{ fontSize: 13, color: hex.textTertiary, marginTop: 8 }}>
            {comparisonSummary}
          </Text>
          <Text style={{ fontSize: 13, color: hex.textTertiary, marginTop: 4 }}>
            {sessionsComparison}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: hex.surface,
            borderRadius: RADIUS.card,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: hex.border,
          }}
        >
          <Text style={{ ...TYPOGRAPHY.metadata, color: hex.textTertiary }}>
            Key takeaway
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: hex.text,
              marginTop: 8,
            }}
          >
            {keyTakeaway.title}
          </Text>
          <Text
            style={{ fontSize: 14, color: hex.textSecondary, marginTop: 4 }}
          >
            {keyTakeaway.body}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: hex.elevated,
            borderRadius: RADIUS.card,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: hex.border,
          }}
        >
          <Text style={{ fontSize: 13, color: hex.textSecondary }}>
            {changeExplanation.label}
          </Text>
          <Text style={{ fontSize: 13, color: hex.textTertiary, marginTop: 2 }}>
            {changeExplanation.detail}
          </Text>
        </View>

        {activeNote && (
          <View
            style={{
              backgroundColor: hex.elevated,
              borderRadius: RADIUS.card,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: hex.border,
            }}
          >
            <Text style={{ fontSize: 13, color: hex.textSecondary }}>
              Active session not included yet
            </Text>
            <Text
              style={{ fontSize: 13, color: hex.textTertiary, marginTop: 2 }}
            >
              {activeNote}
            </Text>
          </View>
        )}

        {analytics.sessionCount === 0 && (
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
            <Text style={{ ...TYPOGRAPHY.body, color: hex.textSecondary }}>
              {emptyState.title}
            </Text>
            {emptyState.body && (
              <Text
                style={{ fontSize: 14, color: hex.textTertiary, marginTop: 6 }}
              >
                {emptyState.body}
              </Text>
            )}
            <Text
              style={{ fontSize: 13, color: hex.textTertiary, marginTop: 8 }}
            >
              Track across at least 2 days to see patterns.
            </Text>
          </View>
        )}

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
            Time by role
          </Text>
          {roleComparisonRows.length === 0 ? (
            <Text style={{ fontSize: 14, color: hex.textTertiary }}>
              No role activity in this range yet.
            </Text>
          ) : (
            roleComparisonRows.map((role, index) => {
              const pct = role.sharePercent;
              const isLast = index === roleComparisonRows.length - 1;
              return (
                <View
                  key={role.roleId}
                  style={{ marginBottom: isLast ? 0 : 14 }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <RoleIcon
                      icon={role.roleIcon}
                      color={role.roleColor}
                      size={12}
                      bgSize={24}
                    />
                    <Text
                      style={{ fontSize: 14, color: hex.text, flex: 1 }}
                      numberOfLines={1}
                    >
                      {role.roleName}
                    </Text>
                    <Text style={{ fontSize: 13, color: hex.textSecondary }}>
                      {Math.round(pct)}%
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: hex.textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    {role.totalMs > 0
                      ? formatDurationShort(role.totalMs)
                      : "0m"}{" "}
                    · {role.sessionCount} sessions · Avg{" "}
                    {formatDurationShort(role.avgSessionMs)}
                  </Text>
                  {role.deltaCopy && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: hex.textTertiary,
                        marginBottom: 6,
                      }}
                    >
                      {role.deltaCopy}
                    </Text>
                  )}
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: hex.border,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${role.isDroppedFromPrevious ? 0 : Math.max(2, pct)}%`,
                        height: "100%",
                        borderRadius: 3,
                        backgroundColor: role.roleColor,
                        opacity: 0.9,
                      }}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {earningsInsight && (
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
                marginBottom: 8,
              }}
            >
              Estimated earnings
            </Text>
            <Text style={{ fontSize: 24, fontWeight: "700", color: hex.text }}>
              ${(earningsInsight.totalEstimatedCents / 100).toFixed(2)}
            </Text>
            {earningsInsight.topPaidRole && (
              <Text
                style={{ fontSize: 13, color: hex.textSecondary, marginTop: 6 }}
              >
                Top paid role: {earningsInsight.topPaidRole.name} · $
                {(earningsInsight.topPaidRole.estimatedCents / 100).toFixed(2)}
              </Text>
            )}
            {earningsInsight.averagePerPaidSessionCents != null && (
              <Text
                style={{ fontSize: 13, color: hex.textTertiary, marginTop: 4 }}
              >
                Avg per paid session: $
                {(earningsInsight.averagePerPaidSessionCents / 100).toFixed(2)}
              </Text>
            )}
            {earningsInsight.unpaidDurationMs > 0 && (
              <Text
                style={{ fontSize: 12, color: hex.textTertiary, marginTop: 4 }}
              >
                Some tracked time has no hourly rate and is excluded.
              </Text>
            )}
          </View>
        )}

        <View
          style={{
            backgroundColor: hex.surface,
            borderRadius: RADIUS.card,
            padding: 20,
            marginBottom: 24,
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
            Patterns
          </Text>
          {selectedCompleted.length === 0 ||
          selectedCompleted.length <
            INSIGHT_THRESHOLDS.minSessionsForPatterns ? (
            <>
              <Text style={{ fontSize: 14, color: hex.textSecondary }}>
                Not enough activity for patterns yet
              </Text>
              <Text
                style={{ fontSize: 13, color: hex.textTertiary, marginTop: 4 }}
              >
                Track across a few days to unlock patterns.
              </Text>
            </>
          ) : (
            <>
              <StatRow
                label="Avg session length"
                value={formatDurationShort(analytics.avgSessionMs)}
                hex={hex}
              />
              <StatRow
                label="Longest session"
                value={formatDurationShort(analytics.longestSessionMs)}
                hex={hex}
              />
              {patternInsights.mostActiveDay && hasTrendData && (
                <StatRow
                  label="Most active day"
                  value={patternInsights.mostActiveDay.label}
                  hex={hex}
                />
              )}
              {patternInsights.startWindowLabel && (
                <StatRow
                  label="Most common start time"
                  value={patternInsights.startWindowLabel}
                  hex={hex}
                />
              )}
              <StatRow
                label="Active days"
                value={`${patternInsights.activeDays} of ${selectedRange.days} days`}
                hex={hex}
              />
              <StatRow
                label="Busiest role"
                value={analytics.topRoleByDuration?.roleName ?? "None"}
                hex={hex}
              />
              <StatRow
                label="Session frequency"
                value={`${analytics.switchesPerDay.toFixed(1)} per active day`}
                hex={hex}
              />
            </>
          )}
        </View>

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
            label="Total tracked"
            value={formatDurationShort(analytics.totalMs)}
            hex={hex}
          />
          <StatRow
            label="Completed sessions"
            value={String(analytics.sessionCount)}
            hex={hex}
          />
          <StatRow
            label="Avg session length"
            value={formatDurationShort(analytics.avgSessionMs)}
            hex={hex}
          />
          <StatRow
            label="Longest session"
            value={formatDurationShort(analytics.longestSessionMs)}
            hex={hex}
          />
          <StatRow
            label="Top role"
            value={analytics.topRoleByDuration?.roleName ?? "None"}
            hex={hex}
          />
          {lastCompletedSession && analytics.sessionCount === 0 && (
            <StatRow
              label="Last activity"
              value={`${lastCompletedSession.roleName} · ${new Date(lastCompletedSession.startAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
              hex={hex}
            />
          )}
        </View>
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
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: hex.border,
      }}
    >
      <Text style={{ fontSize: 14, color: hex.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "500", color: hex.text }}>
        {value}
      </Text>
    </View>
  );
}
