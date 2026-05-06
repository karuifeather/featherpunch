import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useThemeColors } from "@/hooks/useThemeColors";
import { AppModal } from "@/components/app-modal";
import { SEMANTIC } from "@/constants/colors";
import type { Role, RoleDeletionSafety } from "@/types";
import { getRoleActionPolicy } from "@/utils/roleDeletionPolicy";

export interface RoleActionsModalProps {
  visible: boolean;
  role: Role | null;
  onClose: () => void;
  onEdit: (role: Role) => void;
  onArchive: (role: Role) => void;
  onDelete: (role: Role) => void;
  deletionSafety: RoleDeletionSafety | null;
}

/**
 * Custom action sheet for role "..." menu. Replaces Alert on Android (and can replace ActionSheet on iOS for consistency).
 */
export function RoleActionsModal({
  visible,
  role,
  onClose,
  onEdit,
  onArchive,
  onDelete,
  deletionSafety,
}: RoleActionsModalProps) {
  const { hex } = useThemeColors();

  if (!role) return null;
  const actionPolicy = deletionSafety
    ? getRoleActionPolicy(role, deletionSafety)
    : null;

  const handleEdit = () => {
    onClose();
    onEdit(role);
  };
  const handleArchive = () => {
    onClose();
    onArchive(role);
  };
  const handleDelete = () => {
    onClose();
    onDelete(role);
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={role.name}
      showHandle
      closeOnBackdrop
    >
      <View style={styles.list}>
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: hex.border }]}
          onPress={handleEdit}
          activeOpacity={0.7}
        >
          <Text style={[styles.rowLabel, { color: hex.text }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.row, { borderBottomColor: hex.border }]}
          onPress={handleArchive}
          disabled={actionPolicy ? !actionPolicy.canArchive : false}
          activeOpacity={0.7}
        >
          <Text style={[styles.rowLabel, { color: hex.text }]}>
            {actionPolicy?.archiveLabel ??
              (role.isArchived ? "Restore" : "Archive")}
          </Text>
        </TouchableOpacity>
        {actionPolicy?.historySummary ? (
          <Text style={[styles.supportingCopy, { color: hex.textSecondary }]}>
            {actionPolicy.historySummary}
          </Text>
        ) : null}
        {actionPolicy?.guidanceMessage ? (
          <Text style={[styles.supportingCopy, { color: hex.textSecondary }]}>
            {actionPolicy.guidanceMessage}
          </Text>
        ) : null}
        <TouchableOpacity
          style={styles.row}
          onPress={handleDelete}
          disabled={actionPolicy ? !actionPolicy.canDeletePermanently : false}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.rowLabel,
              {
                color:
                  actionPolicy && !actionPolicy.canDeletePermanently
                    ? hex.textTertiary
                    : SEMANTIC.destructive,
              },
            ]}
          >
            Delete permanently
          </Text>
        </TouchableOpacity>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  row: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  supportingCopy: {
    fontSize: 13,
    lineHeight: 18,
    paddingTop: 10,
  },
});
