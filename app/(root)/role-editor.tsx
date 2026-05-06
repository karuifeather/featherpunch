import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { DetailOverlayHeader } from '@/components/overlay-header';
import { RoleIcon } from '@/components/role-icon';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { RADIUS, TYPOGRAPHY } from '@/constants/designTokens';
import { ACCENT, SEMANTIC } from '@/constants/colors';
import { ROLE_COLORS, ROLE_ICONS } from '@/constants/roles';
import { getRoleById, createRole, updateRole, deleteRole } from '@/db/roles';
import { useRolesStore } from '@/stores/roles-store';

export interface RoleEditorContentProps {
  id?: string;
  onClose: () => void;
}

export function RoleEditorContent({ id, onClose }: RoleEditorContentProps) {
  const insets = useSafeAreaInsets();
  const { hex, bg } = useThemeColors();
  const bumpRolesVersion = useRolesStore((s) => s.bumpRolesVersion);
  const isEditing = !!id;

  const [name, setName] = useState('');
  const [color, setColor] = useState(ROLE_COLORS[0]);
  const [icon, setIcon] = useState(ROLE_ICONS[0]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmNameRequired, setConfirmNameRequired] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (id) {
      getRoleById(id).then((role) => {
        if (role) {
          setName(role.name);
          setColor(role.color);
          setIcon(role.icon);
          setHourlyRate(role.hourlyRate != null ? String(role.hourlyRate) : '');
        }
      });
    }
  }, [id]);

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
      await createRole({ name: trimmed, color, icon, tag: 'other', hourlyRate: rate });
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
    if (!id) return;
    setConfirmDelete(false);
    await deleteRole(id);
    bumpRolesVersion();
    onClose();
  };

  return (
    <View style={{ flex: 1, backgroundColor: hex.bg } as const}>
      <DetailOverlayHeader title={isEditing ? 'Edit Role' : 'New Role'} onBack={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <RoleIcon icon={icon} color={color} size={32} bgSize={72} />
            <Text style={{ ...TYPOGRAPHY.sectionTitle, color: hex.text, marginTop: 10 }}>
              {name || 'New Role'}
            </Text>
          </View>

          <Text
            style={{
              ...TYPOGRAPHY.metadata,
              color: hex.textTertiary,
              marginBottom: 6,
              textTransform: 'uppercase',
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
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            Color
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
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
                  borderColor: '#fff',
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
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            Icon
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {ROLE_ICONS.map((ic) => (
              <TouchableOpacity
                key={ic}
                onPress={() => setIcon(ic)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: icon === ic ? `${color}30` : hex.surface,
                  borderWidth: icon === ic ? 1.5 : 0,
                  borderColor: icon === ic ? `${color}60` : 'transparent',
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
              textTransform: 'uppercase',
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
              alignItems: 'center',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: ACCENT.primaryForeground }}>
              {isEditing ? 'Save Changes' : 'Create Role'}
            </Text>
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity
              onPress={handleDelete}
              style={{
                marginTop: 16,
                paddingVertical: 14,
                alignItems: 'center',
                borderRadius: RADIUS.button,
                borderWidth: 1,
                borderColor: `${SEMANTIC.destructive}40`,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: SEMANTIC.destructive }}>
                Delete Role
              </Text>
            </TouchableOpacity>
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
        title="Delete Role"
        message="Permanently delete this role and all its role entries?"
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={doDelete}
      />
    </View>
  );
}
