import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/hooks/useThemeColors";
import { DetailOverlayHeader } from "@/components/overlay-header";
import { RoleIcon } from "@/components/role-icon";
import { DateTimePickerModal } from "@/components/date-time-picker-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RADIUS, TYPOGRAPHY } from "@/constants/designTokens";
import { ACCENT, SEMANTIC } from "@/constants/colors";
import { getDb } from "@/db/database";
import { updateSession, deleteSession } from "@/db/sessions";
import { formatTime, formatDurationShort } from "@/utils/formatTime";
import type { SessionWithRole } from "@/types";

export interface SessionEditorContentProps {
  id: string;
  onClose: () => void;
}

export function SessionEditorContent({
  id,
  onClose,
}: SessionEditorContentProps) {
  const insets = useSafeAreaInsets();
  const { hex } = useThemeColors();

  const [session, setSession] = useState<SessionWithRole | null>(null);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [pickerMode, setPickerMode] = useState<"start" | "end" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const db = await getDb();
      const row = await db.getFirstAsync(
        `SELECT s.*,
          r.name as role_name,
          r.color as role_color,
          r.icon as role_icon,
          r.tag as role_tag,
          r.hourly_rate as role_hourly_rate
        FROM sessions s
        JOIN roles r ON s.role_id = r.id
        WHERE s.id = ?`,
        [id],
      );
      if (row) {
        const r = row as Record<string, unknown>;
        const s: SessionWithRole = {
          id: r.id as string,
          roleId: r.role_id as string,
          startAt: r.start_at as string,
          endAt: (r.end_at as string) || null,
          durationMs: r.duration_ms as number | null,
          hourlyRateSnapshot: (r.hourly_rate_snapshot as number) ?? null,
          estimatedEarningsSnapshot:
            (r.estimated_earnings_snapshot as number) ?? null,
          source: r.source as SessionWithRole["source"],
          notes: (r.notes as string) || null,
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
          roleName: r.role_name as string,
          roleColor: r.role_color as string,
          roleIcon: r.role_icon as string,
          roleTag: r.role_tag as SessionWithRole["roleTag"],
          roleCurrentHourlyRate: r.role_hourly_rate as number | null,
          roleHourlyRate:
            (r.hourly_rate_snapshot as number) ??
            null ??
            (r.role_hourly_rate as number | null),
        };
        setSession(s);
        setStartAt(s.startAt);
        setEndAt(s.endAt);
        setNotes(s.notes || "");
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async () => {
    if (!session) return;
    let s = startAt;
    let e = endAt;
    if (s && e && new Date(e).getTime() < new Date(s).getTime()) {
      [s, e] = [e, s];
    }
    const payload: {
      startAt: string;
      endAt?: string | null;
      notes: string | null;
    } = {
      startAt: s,
      notes: notes || null,
    };
    if (session.endAt != null && session.endAt !== "") {
      payload.endAt = e ?? session.endAt;
    } else if (e != null && e !== "") {
      payload.endAt = e;
    }
    await updateSession(session.id, payload);
    onClose();
  };

  const handleDelete = () => setConfirmDelete(true);

  const doDelete = async () => {
    if (!session) return;
    setConfirmDelete(false);
    await deleteSession(session.id);
    onClose();
  };

  if (loading || !session) {
    return (
      <View style={[styles.container, { backgroundColor: hex.bg }]}>
        <DetailOverlayHeader title="Time in role" onBack={onClose} />
      </View>
    );
  }

  const isActive = endAt == null;
  const durationMs =
    startAt && endAt
      ? new Date(endAt).getTime() - new Date(startAt).getTime()
      : null;
  const duration =
    durationMs != null && durationMs >= 0
      ? formatDurationShort(durationMs)
      : isActive
        ? "Active"
        : "—";

  return (
    <View style={[styles.container, { backgroundColor: hex.bg }]}>
      <DetailOverlayHeader title="Edit time in role" onBack={onClose} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 70,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
      >
        <View
          style={{
            backgroundColor: hex.surface,
            borderRadius: RADIUS.card,
            padding: 20,
            marginBottom: 20,
            alignItems: "center",
          }}
        >
          <RoleIcon
            icon={session.roleIcon}
            color={session.roleColor}
            size={24}
            bgSize={56}
          />
          <Text
            style={{
              ...TYPOGRAPHY.sectionTitle,
              color: hex.text,
              marginTop: 10,
            }}
          >
            {session.roleName}
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "200",
              color: hex.text,
              marginTop: 4,
            }}
          >
            {duration}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: hex.surface,
            borderRadius: RADIUS.card,
            paddingHorizontal: 16,
            marginBottom: 20,
            overflow: "hidden",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: hex.textTertiary,
              marginTop: 14,
              marginBottom: 8,
            }}
          >
            Log
          </Text>
          <TouchableOpacity
            onPress={() => setPickerMode("start")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: hex.border,
            }}
          >
            <Text style={{ fontSize: 14, color: hex.textSecondary }}>
              Start
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text
                style={{ fontSize: 15, fontWeight: "600", color: hex.text }}
              >
                {startAt ? formatTime(startAt) : "—"}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={hex.textTertiary}
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPickerMode("end")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 14, color: hex.textSecondary }}>End</Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color:
                    endAt == null || endAt === "" ? hex.textTertiary : hex.text,
                }}
              >
                {endAt != null && endAt !== ""
                  ? formatTime(endAt)
                  : "No end time"}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={hex.textTertiary}
              />
            </View>
          </TouchableOpacity>
        </View>

        <Text
          style={{
            ...TYPOGRAPHY.metadata,
            color: hex.textTertiary,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Notes
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add a note about this time..."
          placeholderTextColor={hex.textTertiary}
          multiline
          style={{
            backgroundColor: hex.surface,
            borderRadius: RADIUS.card,
            padding: 14,
            fontSize: 15,
            color: hex.text,
            minHeight: 80,
            textAlignVertical: "top",
            marginBottom: 24,
          }}
        />

        <TouchableOpacity
          onPress={handleSave}
          style={{
            backgroundColor: ACCENT.primary,
            borderRadius: RADIUS.button,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: ACCENT.primaryForeground,
            }}
          >
            Save
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDelete}
          style={{
            marginTop: 16,
            paddingVertical: 14,
            alignItems: "center",
            borderRadius: RADIUS.button,
            borderWidth: 1,
            borderColor: `${SEMANTIC.destructive}40`,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: SEMANTIC.destructive,
            }}
          >
            Delete role entry
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <DateTimePickerModal
        visible={pickerMode === "start"}
        onClose={() => setPickerMode(null)}
        initialIso={startAt}
        onSelect={(iso) => setStartAt(iso)}
        title="Set start time"
        timeOnly
      />
      <DateTimePickerModal
        visible={pickerMode === "end"}
        onClose={() => setPickerMode(null)}
        initialIso={endAt ?? startAt ?? new Date().toISOString()}
        onSelect={(iso) => setEndAt(iso)}
        title="Set end time"
        timeOnly={false}
        minDateIso={(() => {
          const ref = session.endAt ?? session.startAt;
          if (!ref) return undefined;
          const d = new Date(ref);
          d.setHours(0, 0, 0, 0);
          return d.toISOString();
        })()}
        maxDateIso={(() => {
          const ref = session.endAt ?? session.startAt;
          if (!ref) return undefined;
          const d = new Date(ref);
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() + 1);
          return d.toISOString();
        })()}
      />

      <ConfirmDialog
        visible={confirmDelete}
        title="Delete role entry"
        message="Remove this from your role log permanently?"
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={doDelete}
      />
    </View>
  );
}

export default function SessionEditorRoute() {
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
