import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/hooks/useThemeColors";
import { DetailOverlayHeader } from "@/components/overlay-header";
import { RoleIcon } from "@/components/role-icon";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RADIUS, TYPOGRAPHY } from "@/constants/designTokens";
import { ACCENT, SEMANTIC } from "@/constants/colors";
import { ROLE_COLORS, ROLE_ICONS } from "@/constants/roles";
import {
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRoleDeletionSafety,
  RoleDeleteBlockedError,
} from "@/db/roles";
import { useRolesStore } from "@/stores/roles-store";
import { useSessionStore } from "@/stores/session-store";
import type { Role, RoleDeletionSafety } from "@/types";
import { getRoleActionPolicy } from "@/utils/roleDeletionPolicy";

export interface RoleEditorContentProps {
  id?: string;
  onClose: () => void;
}

export function RoleEditorContent({ id, onClose }: RoleEditorContentProps) {
  const insets = useSafeAreaInsets();
  const { hex } = useThemeColors();
  const bumpRolesVersion = useRolesStore((s) => s.bumpRolesVersion);
  const isEditing = !!id;

  const [name, setName] = useState("");
  const [color, setColor] = useState(ROLE_COLORS[0]);
  const [icon, setIcon] = useState(ROLE_ICONS[0]);
  const [hourlyRate, setHourlyRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmNameRequired, setConfirmNameRequired] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [loadedRole, setLoadedRole] = useState<Role | null>(null);
  const [deletionSafety, setDeletionSafety] =
    useState<RoleDeletionSafety | null>(null);
  const activeRoleId = useSessionStore((s) => s.active?.roleId ?? null);

  useEffect(() => {
    if (id) {
      getRoleById(id).then((role) => {
        if (role) {
          setLoadedRole(role);
          setName(role.name);
          setColor(role.color);
          setIcon(role.icon);
          setHourlyRate(role.hourlyRate != null ? String(role.hourlyRate) : "");
        }
      });
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    getRoleDeletionSafety(id).then(setDeletionSafety);
  }, [id, activeRoleId]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setConfirmNameRequired(true);
      return;
    }

    setSaving(true);
    const rate = hourlyRate ? parseFloat(hourlyRate) : null;

    if (isEditing && id) {
      await updateRole(id, { name: trimmed, color, icon, hourlyRate: rate });
    } else {
      await createRole({
        name: trimmed,
        color,
        icon,
        tag: "other",
        hourlyRate: rate,
      });
    }

    setSaving(false);
    bumpRolesVersion();
    onClose();
  };

  const handleDelete = () => {
    if (!id) return;
    setConfirmDelete(true);
  };

  const doDelete = async () => {
    if (!id || !loadedRole || !deletionSafety) return;
    const policy = getRoleActionPolicy(loadedRole, deletionSafety);
    setConfirmDelete(false);
    if (!policy.canDeletePermanently) return;
    try {
      await deleteRole(id);
    } catch (error) {
      if (!(error instanceof RoleDeleteBlockedError)) {
        throw error;
      }
      return;
    }
    bumpRolesVersion();
    onClose();
  };

  const doArchive = async () => {
    if (!id || !loadedRole || !deletionSafety) return;
    const policy = getRoleActionPolicy(loadedRole, deletionSafety);
    setConfirmArchive(false);
    if (!policy.canArchive) return;
    await updateRole(id, { isArchived: !loadedRole.isArchived });
    bumpRolesVersion();
    onClose();
  };

  const policy =
    loadedRole && deletionSafety
      ? getRoleActionPolicy(loadedRole, deletionSafety)
      : null;

  return (
    <View style={{ flex: 1, backgroundColor: hex.bg } as const}>
      <DetailOverlayHeader
        title={isEditing ? "Edit Role" : "New Role"}
        onBack={onClose}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 70,
            paddingBottom: insets.bottom + 40,
            paddingHorizontal: 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <RoleIcon icon={icon} color={color} size={32} bgSize={72} />
            <Text
              style={{
                ...TYPOGRAPHY.sectionTitle,
                color: hex.text,
                marginTop: 10,
              }}
            >
              {name || "New Role"}
            </Text>
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
            Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Studying, Working, Rest..."
            placeholderTextColor={hex.textTertiary}
            style={{
              backgroundColor: hex.surface,
              borderRadius: RADIUS.card,
              padding: 14,
              fontSize: 16,
              color: hex.text,
              marginBottom: 20,
            }}
          />

          <Text
            style={{
              ...TYPOGRAPHY.metadata,
              color: hex.textTertiary,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Color
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {ROLE_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: c,
                  borderWidth: color === c ? 3 : 0,
                  borderColor: "#fff",
                  opacity: color === c ? 1 : 0.6,
                }}
              />
            ))}
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
            Icon
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 20,
            }}
          >
            {ROLE_ICONS.map((ic) => (
              <TouchableOpacity
                key={ic}
                onPress={() => setIcon(ic)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: icon === ic ? `${color}30` : hex.surface,
                  borderWidth: icon === ic ? 1.5 : 0,
                  borderColor: icon === ic ? `${color}60` : "transparent",
                }}
              >
                <RoleIcon
                  icon={ic}
                  color={icon === ic ? color : hex.textTertiary}
                  size={18}
                  showBg={false}
                />
              </TouchableOpacity>
            ))}
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
            Hourly Rate (optional)
          </Text>
          <TextInput
            value={hourlyRate}
            onChangeText={setHourlyRate}
            placeholder="0.00"
            placeholderTextColor={hex.textTertiary}
            keyboardType="decimal-pad"
            style={{
              backgroundColor: hex.surface,
              borderRadius: RADIUS.card,
              padding: 14,
              fontSize: 16,
              color: hex.text,
              marginBottom: 30,
            }}
          />

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: ACCENT.primary,
              borderRadius: RADIUS.button,
              paddingVertical: 14,
              alignItems: "center",
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: ACCENT.primaryForeground,
              }}
            >
              {isEditing ? "Save Changes" : "Create Role"}
            </Text>
          </TouchableOpacity>

          {isEditing && (
            <>
              <TouchableOpacity
                onPress={() => setConfirmArchive(true)}
                style={{
                  marginTop: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  borderRadius: RADIUS.button,
                  borderWidth: 1,
                  borderColor: `${hex.textSecondary}30`,
                }}
              >
                <Text
                  style={{ fontSize: 16, fontWeight: "600", color: hex.text }}
                >
                  {policy?.archiveLabel ?? "Archive role"}
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
                  Delete permanently
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirmNameRequired}
        title="Name required"
        message="Give this role a name."
        confirmLabel="OK"
        onCancel={() => setConfirmNameRequired(false)}
        onConfirm={() => setConfirmNameRequired(false)}
      />
      <ConfirmDialog
        visible={confirmDelete}
        title={policy?.deleteDialogTitle ?? "Delete role permanently?"}
        message={
          policy?.deleteDialogMessage ??
          "This role has no logs yet. Deleting it cannot be undone."
        }
        confirmLabel={policy?.deleteConfirmLabel ?? "Delete permanently"}
        destructive={policy?.canDeletePermanently ?? false}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={
          policy && !policy.canDeletePermanently
            ? () => setConfirmDelete(false)
            : doDelete
        }
      />
      <ConfirmDialog
        visible={confirmArchive}
        title={loadedRole?.isArchived ? "Restore role" : "Archive role"}
        message={
          policy?.canArchive
            ? "Archive keeps all logs and removes this role from active use."
            : "Punch out before archiving this role."
        }
        confirmLabel={
          policy?.canArchive
            ? loadedRole?.isArchived
              ? "Restore"
              : "Archive role"
            : "OK"
        }
        onCancel={() => setConfirmArchive(false)}
        onConfirm={
          policy && !policy.canArchive
            ? () => setConfirmArchive(false)
            : doArchive
        }
      />
    </View>
  );
}
