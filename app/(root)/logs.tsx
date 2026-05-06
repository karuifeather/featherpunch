import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useModalStore } from "@/stores/modal-store";
import { useEdgeToEdgeInsets } from "@/hooks/useEdgeToEdgeInsets";
import { useThemeColors } from "@/hooks/useThemeColors";
import { ACCENT, RADIUS, TYPOGRAPHY } from "@/constants/designTokens";
import { formatDurationShort } from "@/utils/formatTime";
import {
  buildLogsQueryBounds,
  buildCompletedLogsQueryOptions,
  buildLogsExportSummaryLines,
  buildSelectedRoleSummaryQueryOptions,
  type CustomDateRange,
  deriveLogsEmptyState,
  getCustomRangeDisplayLabel,
  getLogsRangeSummaryText,
  groupSessionLogsByLocalDay,
  type LogsRangeFilter,
} from "@/utils/sessionLogs";
import {
  getCompletedSessionLogSummary,
  getCompletedSessionLogs,
  getCompletedSessionLogsForExport,
  getRolesWithCompletedSessionHistory,
} from "@/db/sessions";
import { LogFilterBar } from "@/components/log-filter-bar";
import { SessionLogList } from "@/components/session-log-list";
import { LogDateRangeModal } from "@/components/log-date-range-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusDialog } from "@/components/status-dialog";
import type { CompletedSessionLogSummary, SessionLogEntry } from "@/types";
import {
  exportCsvFile,
  buildLogsExportFilename,
  sessionLogsToCsv,
} from "@/services/csv-export";
import { getRollingRange } from "@/utils/dateRanges";

const RANGE_OPTIONS: Array<{ id: LogsRangeFilter; label: string }> = [
  { id: "last7Days", label: "Last 7 days" },
  { id: "last30Days", label: "Last 30 days" },
  { id: "last90Days", label: "Last 90 days" },
  { id: "custom", label: "Custom" },
  { id: "all", label: "All" },
];

const DEFAULT_LIMIT = 100;
const ALL_ROLES_ID = "all";

export default function LogsScreen() {
  const router = useRouter();
  const { roleId } = useLocalSearchParams<{ roleId?: string }>();
  const { openSessionEditor, sessionEditorId } = useModalStore();
  const { bg, hex } = useThemeColors();
  const { top: safeTop } = useEdgeToEdgeInsets();
  const prevSessionEditorId = useRef<string | null>(null);
  const [selectedRange, setSelectedRange] =
    useState<LogsRangeFilter>("last30Days");
  const [customRangeDraftVisible, setCustomRangeDraftVisible] = useState(false);
  const [customRange, setCustomRange] = useState<CustomDateRange>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  });
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    roleId ?? ALL_ROLES_ID,
  );
  const [entries, setEntries] = useState<SessionLogEntry[]>([]);
  const [totalCompletedCount, setTotalCompletedCount] = useState(0);
  const [selectedRoleSummary, setSelectedRoleSummary] =
    useState<CompletedSessionLogSummary | null>(null);
  const [roleOptions, setRoleOptions] = useState<
    Array<{ id: string; label: string }>
  >([{ id: ALL_ROLES_ID, label: "All roles" }]);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingExportEntries, setPendingExportEntries] = useState<
    SessionLogEntry[] | null
  >(null);
  const [exportConfirmVisible, setExportConfirmVisible] = useState(false);
  const [statusDialog, setStatusDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    tone: "success" | "warning" | "error" | "info";
  }>({
    visible: false,
    title: "",
    message: "",
    tone: "info",
  });

  const reload = useCallback(async () => {
    const roleFilter =
      selectedRoleId === ALL_ROLES_ID ? undefined : selectedRoleId;
    const bounds = buildLogsQueryBounds({
      selectedRange,
      customRange,
    });

    const [nextEntries, nextRoleOptions, hasAnyCompleted, nextSummary] =
      await Promise.all([
        getCompletedSessionLogs({
          roleId: roleFilter,
          startIso: bounds.startIso,
          endExclusiveIso: bounds.endExclusiveIso,
          limit: DEFAULT_LIMIT,
        }),
        getRolesWithCompletedSessionHistory(),
        getCompletedSessionLogs({ limit: 1 }),
        roleFilter
          ? getCompletedSessionLogSummary(
              buildSelectedRoleSummaryQueryOptions({
                roleId: roleFilter,
                selectedRange,
                customRange,
              }),
            )
          : Promise.resolve(null),
      ]);

    const filterOptions = [
      { id: ALL_ROLES_ID, label: "All roles" },
      ...nextRoleOptions.map((r) => ({ id: r.id, label: r.name })),
    ];
    setRoleOptions(filterOptions);

    const hasSelectedRole = filterOptions.some((r) => r.id === selectedRoleId);
    if (!hasSelectedRole) {
      setSelectedRoleId(ALL_ROLES_ID);
    }

    setEntries(nextEntries);
    setTotalCompletedCount(hasAnyCompleted.length);
    setSelectedRoleSummary(nextSummary);
  }, [customRange, selectedRange, selectedRoleId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );
  useEffect(() => {
    if (prevSessionEditorId.current !== null && sessionEditorId === null) {
      reload();
    }
    prevSessionEditorId.current = sessionEditorId;
  }, [reload, sessionEditorId]);

  const grouped = useMemo(() => groupSessionLogsByLocalDay(entries), [entries]);

  const rangeSummaryText = useMemo(
    () =>
      getLogsRangeSummaryText({
        selectedRange,
        customRange,
        listLimit: DEFAULT_LIMIT,
      }),
    [customRange, selectedRange],
  );

  const selectedRoleName = useMemo(
    () => roleOptions.find((r) => r.id === selectedRoleId)?.label,
    [roleOptions, selectedRoleId],
  );
  const selectedRangeLabel = useMemo(() => {
    const option = RANGE_OPTIONS.find((r) => r.id === selectedRange);
    return option?.label ?? "Last 30 days";
  }, [selectedRange]);
  const customRangeLabel = useMemo(
    () => getCustomRangeDisplayLabel(customRange),
    [customRange],
  );
  const emptyState = deriveLogsEmptyState({
    totalCompletedCount,
    filteredCount: entries.length,
    selectedRange,
    selectedRangeLabel,
    customRangeLabel,
    selectedRoleName:
      selectedRoleId === ALL_ROLES_ID
        ? undefined
        : (selectedRoleName ?? undefined),
  });
  const showSummaryCard =
    selectedRoleId !== ALL_ROLES_ID &&
    selectedRoleSummary != null &&
    selectedRoleSummary.completedSessionCount > 0;
  const summaryRangeLabel =
    selectedRange === "custom" ? customRangeLabel : selectedRangeLabel;
  const exportQueryOptions = useMemo(() => {
    return buildCompletedLogsQueryOptions({
      selectedRange,
      customRange,
      roleId: selectedRoleId === ALL_ROLES_ID ? undefined : selectedRoleId,
    });
  }, [customRange, selectedRange, selectedRoleId]);
  const canExport = !isExporting && entries.length > 0;

  const getExportRangeSummary = useCallback(() => {
    if (selectedRange === "all") return "All";
    if (selectedRange === "custom") return `Custom · ${customRangeLabel}`;
    const rolling = getRollingRange(selectedRange);
    return `${rolling.label} · ${rolling.displayRange}`;
  }, [customRangeLabel, selectedRange]);

  const performExport = useCallback(
    async (matchingEntries: SessionLogEntry[]) => {
      setIsExporting(true);
      try {
        const csv = sessionLogsToCsv(matchingEntries);
        const filename = buildLogsExportFilename({
          selectedRange,
          roleName:
            selectedRoleId === ALL_ROLES_ID ? undefined : selectedRoleName,
          customRange: selectedRange === "custom" ? customRange : undefined,
        });
        await exportCsvFile(filename, csv);
        setStatusDialog({
          visible: true,
          title: "Export ready.",
          message: "Your logs CSV is ready to share.",
          tone: "success",
        });
      } catch {
        setStatusDialog({
          visible: true,
          title: "Export failed",
          message: "Could not export logs. Please try again.",
          tone: "error",
        });
      } finally {
        setIsExporting(false);
      }
    },
    [customRange, selectedRange, selectedRoleId, selectedRoleName],
  );

  const handleExportLogs = useCallback(async () => {
    if (isExporting) return;
    const matchingEntries =
      await getCompletedSessionLogsForExport(exportQueryOptions);
    if (matchingEntries.length === 0) {
      setStatusDialog({
        visible: true,
        title: "No logs available",
        message: "No logs to export for this range.",
        tone: "warning",
      });
      return;
    }

    setPendingExportEntries(matchingEntries);
    setExportConfirmVisible(true);
  }, [
    exportQueryOptions,
    getExportRangeSummary,
    isExporting,
    performExport,
    selectedRoleId,
    selectedRoleName,
    selectedRoleSummary,
  ]);

  const handleSelectRange = (id: string) => {
    if (id === "custom") {
      setCustomRangeDraftVisible(true);
      return;
    }
    setSelectedRange(id as LogsRangeFilter);
  };

  return (
    <View className={`flex-1 ${bg}`}>
      <ScrollView
        className={bg}
        contentContainerStyle={{
          paddingTop: safeTop + 12,
          paddingBottom: 32,
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            marginBottom: 4,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 4, marginLeft: -4 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <FontAwesome name="chevron-left" size={20} color={ACCENT.primary} />
          </TouchableOpacity>
          <View>
            <Text style={{ ...TYPOGRAPHY.sectionTitle, color: hex.text }}>
              Logs
            </Text>
            <Text style={{ ...TYPOGRAPHY.body, color: hex.textSecondary }}>
              Review your completed shifts.
            </Text>
          </View>
        </View>

        <View
          style={{
            marginTop: 14,
            marginBottom: 12,
            backgroundColor: hex.surface,
            borderRadius: RADIUS.card,
            borderWidth: 1,
            borderColor: hex.border,
            padding: 12,
          }}
        >
          <LogFilterBar
            rangeOptions={RANGE_OPTIONS}
            roleOptions={roleOptions}
            selectedRangeId={selectedRange}
            selectedRoleId={selectedRoleId}
            onSelectRange={handleSelectRange}
            onSelectRole={setSelectedRoleId}
            rangeSummaryText={rangeSummaryText}
          />
          <View style={{ marginTop: 10 }}>
            <TouchableOpacity
              onPress={() => {
                void handleExportLogs();
              }}
              disabled={!canExport}
              style={{
                borderRadius: RADIUS.button,
                borderWidth: 1,
                borderColor: canExport ? ACCENT.primary : hex.border,
                paddingVertical: 10,
                paddingHorizontal: 12,
                alignItems: "center",
                justifyContent: "center",
                opacity: canExport ? 1 : 0.6,
              }}
              accessibilityRole="button"
              accessibilityLabel="Export current logs"
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={ACCENT.primary} />
              ) : (
                <Text style={{ ...TYPOGRAPHY.body, color: ACCENT.primary }}>
                  Export current logs
                </Text>
              )}
            </TouchableOpacity>
            {!canExport ? (
              <Text
                style={{
                  ...TYPOGRAPHY.metadata,
                  color: hex.textTertiary,
                  marginTop: 6,
                }}
              >
                No logs to export for this range.
              </Text>
            ) : null}
          </View>
        </View>
        {showSummaryCard ? (
          <View
            style={{
              marginBottom: 12,
              backgroundColor: hex.surface,
              borderRadius: RADIUS.card,
              borderWidth: 1,
              borderColor: hex.border,
              padding: 14,
            }}
          >
            <Text style={{ ...TYPOGRAPHY.metadata, color: hex.textTertiary }}>
              {selectedRoleName} total
            </Text>
            <Text
              style={{
                ...TYPOGRAPHY.sectionTitle,
                color: hex.text,
                marginTop: 4,
              }}
            >
              {formatDurationShort(selectedRoleSummary.totalDurationMs)}
            </Text>
            <Text
              style={{
                ...TYPOGRAPHY.metadata,
                color: hex.textSecondary,
                marginTop: 4,
              }}
            >
              {selectedRoleSummary.completedSessionCount} sessions ·{" "}
              {summaryRangeLabel}
            </Text>
            {selectedRoleSummary.estimatedEarnings != null ? (
              <View style={{ marginTop: 10 }}>
                <Text
                  style={{ ...TYPOGRAPHY.metadata, color: hex.textTertiary }}
                >
                  Estimated earnings
                </Text>
                <Text
                  style={{
                    ...TYPOGRAPHY.body,
                    color: hex.textSecondary,
                    marginTop: 2,
                  }}
                >
                  ${selectedRoleSummary.estimatedEarnings.toFixed(2)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {entries.length === 0 ? (
          <View
            style={{
              marginTop: 10,
              backgroundColor: hex.surface,
              borderRadius: RADIUS.card,
              borderWidth: 1,
              borderColor: hex.border,
              padding: 20,
            }}
          >
            <Text style={{ ...TYPOGRAPHY.body, color: hex.textSecondary }}>
              {emptyState.title}
            </Text>
            <Text
              style={{
                ...TYPOGRAPHY.metadata,
                color: hex.textTertiary,
                marginTop: 6,
              }}
            >
              {emptyState.body}
            </Text>
          </View>
        ) : (
          <SessionLogList
            groups={grouped}
            onPressEntry={(entry) => openSessionEditor(entry.id)}
          />
        )}
      </ScrollView>
      <LogDateRangeModal
        visible={customRangeDraftVisible}
        initialRange={customRange}
        onClose={() => setCustomRangeDraftVisible(false)}
        onApply={(nextRange) => {
          setCustomRange(nextRange);
          setSelectedRange("custom");
          setCustomRangeDraftVisible(false);
        }}
      />
      <ConfirmDialog
        visible={exportConfirmVisible}
        title="Export current logs"
        message={buildLogsExportSummaryLines({
          count: pendingExportEntries?.length ?? 0,
          rangeSummary: getExportRangeSummary(),
          selectedRoleName:
            selectedRoleId === ALL_ROLES_ID ? undefined : selectedRoleName,
          selectedRoleSummary:
            selectedRoleId === ALL_ROLES_ID ? null : selectedRoleSummary,
        }).join("\n")}
        confirmLabel="Export CSV"
        onCancel={() => {
          setExportConfirmVisible(false);
          setPendingExportEntries(null);
        }}
        onConfirm={() => {
          const entriesForExport = pendingExportEntries;
          setExportConfirmVisible(false);
          setPendingExportEntries(null);
          if (entriesForExport) {
            void performExport(entriesForExport);
          }
        }}
      />
      <StatusDialog
        visible={statusDialog.visible}
        title={statusDialog.title}
        message={statusDialog.message}
        tone={statusDialog.tone}
        onConfirm={() =>
          setStatusDialog((prev) => ({
            ...prev,
            visible: false,
          }))
        }
      />
    </View>
  );
}
