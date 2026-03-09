import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { RADIUS, TYPOGRAPHY } from '@/constants/designTokens';
import { ACCENT, SEMANTIC } from '@/constants/colors';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel: string;
  /** When true, confirm button uses destructive color. */
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Custom confirmation dialog (replaces Alert.alert for confirmations).
 * Centered card with title, message, Cancel and Confirm buttons.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel = 'Cancel',
  confirmLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const { hex } = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
        onPress={onCancel}
      >
        <View style={styles.centered}>
          <Pressable
            style={[
              styles.card,
              {
                backgroundColor: hex.elevated,
                borderColor: hex.border,
                ...(Platform.OS === 'android' && {
                  elevation: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 12,
                }),
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.title, { color: hex.text }]}>{title}</Text>
            <Text style={[styles.message, { color: hex.textSecondary }]}>{message}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={onCancel}
                style={[styles.button, styles.cancelButton, { borderColor: hex.border }]}
              >
                <Text style={[styles.cancelLabel, { color: hex.text }]}>{cancelLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onConfirm}
                style={[
                  styles.button,
                  styles.confirmButton,
                  {
                    backgroundColor: destructive ? SEMANTIC.destructive : ACCENT.primary,
                  },
                ]}
              >
                <Text style={styles.confirmLabel}>{confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: 20,
  },
  title: {
    ...TYPOGRAPHY.cardTitle,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: RADIUS.button,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {},
  confirmLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
