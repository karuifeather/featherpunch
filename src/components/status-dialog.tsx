import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { ACCENT, SEMANTIC } from "@/constants/colors";
import { RADIUS, TYPOGRAPHY } from "@/constants/designTokens";
import { useThemeColors } from "@/hooks/useThemeColors";

type StatusTone = "success" | "warning" | "error" | "info";

export function StatusDialog({
  visible,
  title,
  message,
  tone = "info",
  confirmLabel = "OK",
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  tone?: StatusTone;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  const { hex } = useThemeColors();
  const accentColor = (() => {
    switch (tone) {
      case "success":
        return SEMANTIC.success;
      case "warning":
        return SEMANTIC.warning;
      case "error":
        return SEMANTIC.destructive;
      default:
        return ACCENT.primary;
    }
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onConfirm}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onConfirm}>
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={70}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.08)" },
          ]}
        />
        <View style={styles.centered}>
          <Pressable
            style={[
              styles.card,
              {
                backgroundColor: hex.elevated,
                borderColor: hex.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.toneBar,
                {
                  backgroundColor: accentColor,
                },
              ]}
            />
            <Text style={[styles.title, { color: hex.text }]}>{title}</Text>
            <Text style={[styles.message, { color: hex.textSecondary }]}>
              {message}
            </Text>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.button, { backgroundColor: accentColor }]}
            >
              <Text style={styles.buttonLabel}>{confirmLabel}</Text>
            </TouchableOpacity>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: 20,
    overflow: "hidden",
  },
  toneBar: {
    height: 4,
    borderRadius: 999,
    marginBottom: 14,
  },
  title: {
    ...TYPOGRAPHY.cardTitle,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 18,
  },
  button: {
    borderRadius: RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
  },
  buttonLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
