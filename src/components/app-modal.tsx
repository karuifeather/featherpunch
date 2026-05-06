import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/hooks/useThemeColors";
import { RADIUS } from "@/constants/designTokens";

const BACKDROP_OPACITY = 0.08;
const BACKDROP_BLUR_INTENSITY = 70;
const H_PAD = 20;

export interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  /** Optional title; when set, shows header row with title and close button (or headerRight). */
  title?: string;
  /** Custom right-side header content. When title is set and this is not provided, a close (X) button is shown. */
  headerRight?: React.ReactNode;
  /** Show handle bar at top of sheet. Default true. */
  showHandle?: boolean;
  /** Allow closing by pressing the backdrop. Default true. */
  closeOnBackdrop?: boolean;
  /** Sheet content (scrollable body). */
  children: React.ReactNode;
}

/**
 * Custom bottom-sheet style modal used across the app.
 * Replaces raw React Native Modal with consistent styling, theme, and behavior on Android and iOS.
 */
export function AppModal({
  visible,
  onClose,
  title,
  headerRight,
  showHandle = true,
  closeOnBackdrop = true,
  children,
}: AppModalProps) {
  const insets = useSafeAreaInsets();
  const { hex } = useThemeColors();

  const defaultCloseButton =
    title != null ? (
      <TouchableOpacity
        onPress={onClose}
        hitSlop={12}
        style={styles.closeBtn}
        accessibilityLabel="Close"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={22} color={hex.textSecondary} />
      </TouchableOpacity>
    ) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === "android"}
    >
      <View style={StyleSheet.absoluteFill} collapsable={false}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeOnBackdrop ? onClose : undefined}
        >
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={BACKDROP_BLUR_INTENSITY}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: `rgba(0,0,0,${BACKDROP_OPACITY})` },
            ]}
          />
        </Pressable>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: hex.bg,
              paddingTop: insets.top,
              paddingBottom: insets.bottom + 24,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {showHandle && (
            <View style={[styles.handle, { backgroundColor: hex.border }]} />
          )}
          {title != null && (
            <View style={styles.header}>
              <Text
                style={[styles.title, { color: hex.text }]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {headerRight ?? defaultCloseButton}
            </View>
          )}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: RADIUS.modal,
    borderTopRightRadius: RADIUS.modal,
    overflow: "hidden",
    maxHeight: "90%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.4,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
});
