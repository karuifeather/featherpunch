import React from 'react';
import { Modal, View, StyleSheet, Platform } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface FullScreenModalProps {
  visible: boolean;
  onRequestClose?: () => void;
  children: React.ReactNode;
}

/**
 * Full-screen overlay modal (e.g. for role editor, session editor).
 * Uses same slide-up animation and theme as the rest of the app, not the default Android dialog.
 */
export function FullScreenModal({
  visible,
  onRequestClose,
  children,
}: FullScreenModalProps) {
  const { hex } = useThemeColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={[styles.container, { backgroundColor: hex.bg }]}>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
