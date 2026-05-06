import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/hooks/useThemeColors";
import { RoleIcon } from "@/components/role-icon";
import { AppModal } from "@/components/app-modal";
import { RADIUS, ACCENT } from "@/constants/designTokens";
import { getSessionsByRoleIds } from "@/db/sessions";
import {
  buildLogsExportFilename,
  sessionsToCsvWithFields,
  exportCsvFile,
  SESSION_EXPORT_FIELDS,
  type SessionExportFieldKey,
} from "@/services/csv-export";
import { LogDateRangeModal } from "@/components/log-date-range-modal";
import { StatusDialog } from "@/components/status-dialog";
import {
  buildLogsQueryBounds,
  getCustomRangeDisplayLabel,
  type CustomDateRange,
  type LogsRangeFilter,
} from "@/utils/sessionLogs";
import type { Role } from "@/types";

const H_PAD = 20;
const RANGE_OPTIONS: Array<{ id: LogsRangeFilter; label: string }> = [
  { id: "last7Days", label: "Last 7 days" },
  { id: "last30Days", label: "Last 30 days" },
  { id: "last90Days", label: "Last 90 days" },
  { id: "custom", label: "Custom" },
  { id: "all", label: "All" },
];

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  roles: Role[];
}

export function ExportModal({ visible, onClose, roles }: ExportModalProps) {
  const { hex } = useThemeColors();
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedFields, setSelectedFields] = useState<
    Set<SessionExportFieldKey>
  >(() => new Set(SESSION_EXPORT_FIELDS.map((f) => f.key)));
  const [exporting, setExporting] = useState(false);
  const [selectedRange, setSelectedRange] = useState<LogsRangeFilter>("all");
  const [customRangeModalVisible, setCustomRangeModalVisible] = useState(false);
  const [customRange, setCustomRange] = useState<CustomDateRange>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29);
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  });
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

  const rolesForList = useMemo(
    () => [
      ...roles.filter((r) => !r.isArchived),
      ...roles.filter((r) => r.isArchived),
    ],
    [roles],
  );
  const allRolesSelected =
    rolesForList.length > 0 &&
    rolesForList.every((r) => selectedRoleIds.has(r.id));
  const allFieldsSelected = SESSION_EXPORT_FIELDS.every((f) =>
    selectedFields.has(f.key),
  );

  const toggleRole = (id: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllRoles = () => {
    if (allRolesSelected) setSelectedRoleIds(new Set());
    else setSelectedRoleIds(new Set(rolesForList.map((r) => r.id)));
  };

  const toggleField = (key: SessionExportFieldKey) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        if (next.size === 0) return prev;
        return next;
      }
      next.add(key);
      return next;
    });
  };

  const toggleAllFields = () => {
    if (allFieldsSelected) {
      const first = SESSION_EXPORT_FIELDS[0].key;
      setSelectedFields(new Set([first]));
    } else {
      setSelectedFields(new Set(SESSION_EXPORT_FIELDS.map((f) => f.key)));
    }
  };

  const canExport = selectedRoleIds.size > 0 && selectedFields.size > 0;
  const rangeSummary =
    selectedRange === "custom"
      ? `Custom · ${getCustomRangeDisplayLabel(customRange)}`
      : (RANGE_OPTIONS.find((opt) => opt.id === selectedRange)?.label ?? "All");

  const handleExport = async () => {
    if (!canExport || exporting) return;
    setExporting(true);
    try {
      const sessions = await getSessionsByRoleIds(Array.from(selectedRoleIds));
      const bounds = buildLogsQueryBounds({
        selectedRange,
        customRange,
      });
      const filteredSessions = sessions.filter((session) => {
        if (session.endAt == null) return false;
        if (bounds.startIso && session.startAt < bounds.startIso) return false;
        if (
          bounds.endExclusiveIso &&
          session.startAt >= bounds.endExclusiveIso
        ) {
          return false;
        }
        return true;
      });
      if (filteredSessions.length === 0) {
        setStatusDialog({
          visible: true,
          title: "No logs available",
          message: "No logs to export for this range.",
          tone: "warning",
        });
        return;
      }
      const fieldKeys = Array.from(selectedFields) as SessionExportFieldKey[];
      const csv = sessionsToCsvWithFields(filteredSessions, fieldKeys);
      const filename = buildLogsExportFilename({
        selectedRange,
        roleName:
          selectedRoleIds.size === 1
            ? rolesForList.find((role) => selectedRoleIds.has(role.id))?.name
            : undefined,
        customRange: selectedRange === "custom" ? customRange : undefined,
      });
      await exportCsvFile(filename, csv);
      onClose();
      setStatusDialog({
        visible: true,
        title: "Export ready.",
        message: "Your role log CSV is ready to share.",
        tone: "success",
      });
    } catch {
      setStatusDialog({
        visible: true,
        title: "Export failed",
        message: "Could not export role log.",
        tone: "error",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <AppModal visible={visible} onClose={onClose} title="Export role log">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionLabel, { color: hex.textTertiary }]}>
            Roles to include
          </Text>
          <View style={[styles.card, { backgroundColor: hex.surface }]}>
            <TouchableOpacity
              onPress={toggleAllRoles}
              style={styles.row}
              accessibilityLabel={
                allRolesSelected ? "Deselect all roles" : "Select all roles"
              }
            >
              <Text style={[styles.rowLabel, { color: hex.text }]}>
                All roles
              </Text>
              <View
                style={[
                  styles.check,
                  {
                    borderColor: hex.border,
                    backgroundColor: allRolesSelected
                      ? ACCENT.primary
                      : "transparent",
                  },
                ]}
              >
                {allRolesSelected && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            {rolesForList.map((role) => {
              const selected = selectedRoleIds.has(role.id);
              return (
                <TouchableOpacity
                  key={role.id}
                  onPress={() => toggleRole(role.id)}
                  style={[styles.row, styles.roleRow]}
                >
                  <RoleIcon
                    icon={role.icon}
                    color={role.color}
                    size={20}
                    bgSize={36}
                  />
                  <Text
                    style={[styles.rowLabel, { color: hex.text }]}
                    numberOfLines={1}
                  >
                    {role.name}
                    {role.isArchived ? " (archived)" : ""}
                  </Text>
                  <View
                    style={[
                      styles.check,
                      {
                        borderColor: hex.border,
                        backgroundColor: selected
                          ? ACCENT.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {rolesForList.length === 0 && (
            <Text style={[styles.hint, { color: hex.textTertiary }]}>
              Create roles first, then export their time log.
            </Text>
          )}

          <Text
            style={[
              styles.sectionLabel,
              { color: hex.textTertiary, marginTop: 24 },
            ]}
          >
            Range
          </Text>
          <View style={[styles.card, { backgroundColor: hex.surface }]}>
            {RANGE_OPTIONS.map((option) => {
              const selected = selectedRange === option.id;
              return (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => {
                    if (option.id === "custom") {
                      setCustomRangeModalVisible(true);
                      return;
                    }
                    setSelectedRange(option.id);
                  }}
                  style={styles.row}
                >
                  <Text style={[styles.rowLabel, { color: hex.text }]}>
                    {option.label}
                  </Text>
                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={ACCENT.primary}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: hex.textTertiary }]}>
            {rangeSummary}
          </Text>

          <Text
            style={[
              styles.sectionLabel,
              { color: hex.textTertiary, marginTop: 24 },
            ]}
          >
            Columns to include
          </Text>
          <View style={[styles.card, { backgroundColor: hex.surface }]}>
            <TouchableOpacity
              onPress={toggleAllFields}
              style={styles.row}
              accessibilityLabel={
                allFieldsSelected
                  ? "Deselect all columns"
                  : "Select all columns"
              }
            >
              <Text style={[styles.rowLabel, { color: hex.text }]}>
                All columns
              </Text>
              <View
                style={[
                  styles.check,
                  {
                    borderColor: hex.border,
                    backgroundColor: allFieldsSelected
                      ? ACCENT.primary
                      : "transparent",
                  },
                ]}
              >
                {allFieldsSelected && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            {SESSION_EXPORT_FIELDS.map(({ key, label }) => {
              const selected = selectedFields.has(key);
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => toggleField(key)}
                  style={styles.row}
                >
                  <Text
                    style={[styles.rowLabel, { color: hex.textSecondary }]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <View
                    style={[
                      styles.check,
                      {
                        borderColor: hex.border,
                        backgroundColor: selected
                          ? ACCENT.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: hex.border }]}>
          <TouchableOpacity
            onPress={handleExport}
            disabled={!canExport || exporting}
            style={[
              styles.exportBtn,
              {
                backgroundColor: canExport ? ACCENT.primary : hex.elevated,
                opacity: canExport ? 1 : 0.6,
              },
            ]}
          >
            {exporting ? (
              <ActivityIndicator
                size="small"
                color={ACCENT.primaryForeground}
              />
            ) : (
              <Text
                style={[
                  styles.exportBtnLabel,
                  {
                    color: canExport
                      ? ACCENT.primaryForeground
                      : hex.textSecondary,
                  },
                ]}
              >
                Export CSV
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </AppModal>
      <LogDateRangeModal
        visible={customRangeModalVisible}
        initialRange={customRange}
        onClose={() => setCustomRangeModalVisible(false)}
        onApply={(nextRange) => {
          setCustomRange(nextRange);
          setSelectedRange("custom");
          setCustomRangeModalVisible(false);
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
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: H_PAD, paddingBottom: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  card: {
    borderRadius: RADIUS.card,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  roleRow: { gap: 10 },
  rowLabel: { flex: 1, fontSize: 15 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 13, marginTop: 8 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: H_PAD,
    paddingTop: 16,
    paddingBottom: 16,
  },
  exportBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  exportBtnLabel: { fontSize: 16, fontWeight: "600" },
});
