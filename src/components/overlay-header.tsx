import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ACCENT } from '@/constants/designTokens';

/** Content row min height (excluding safe area). Tighter = more native. */
export const OVERLAY_HEADER_ROW_HEIGHT = 40;

const CONTENT_PADDING_H = 20;
const CONTENT_PADDING_V = 10;

/** Total header content height (status bar excluded). Used for content paddingTop. */
export const OVERLAY_HEADER_CONTENT_HEIGHT =
  OVERLAY_HEADER_ROW_HEIGHT + CONTENT_PADDING_V * 2;

export interface OverlayHeaderProps {
  /** Primary header title (e.g. Today, Roles, Insights, Settings). */
  title: string;
  /** Optional small label above title (e.g. "FeatherPunch" on Home only). */
  subtitle?: string;
  /** Optional right-side element (e.g. "+ New Role" on Roles). */
  trailing?: React.ReactNode;
}

/**
 * Top-level tab screen header: title-first, flat, no wordmark dominance.
 * Use for Home (title="Today", optional subtitle), Roles, Insights, Settings.
 */
export function OverlayHeader({ title, subtitle, trailing }: OverlayHeaderProps) {
  const insets = useSafeAreaInsets();
  const { hex } = useThemeColors();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top,
          backgroundColor: hex.bg,
          borderBottomColor: hex.border,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.row, { paddingHorizontal: CONTENT_PADDING_H, paddingVertical: CONTENT_PADDING_V }]}>
        <View style={styles.titleBlock}>
          {subtitle != null && subtitle !== '' && (
            <Text
              style={[styles.subtitle, { color: hex.textTertiary }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
          <Text
            style={[styles.title, { color: hex.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        {trailing != null ? <View style={styles.headerTrailing}>{trailing}</View> : null}
      </View>
    </View>
  );
}

export default OverlayHeader;

export interface DetailOverlayHeaderProps {
  title: string;
  onBack?: () => void;
  /** Optional trailing element (e.g. Save button). */
  trailing?: React.ReactNode;
}

/**
 * Detail/pushed screen header: back button + title, compact nav bar.
 * Flat background, no blur. Use for role-editor, session-editor, etc.
 */
export function DetailOverlayHeader({
  title,
  onBack,
  trailing,
}: DetailOverlayHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hex } = useThemeColors();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top,
          backgroundColor: hex.bg,
          borderBottomColor: hex.border,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.detailRow, { paddingHorizontal: CONTENT_PADDING_H, paddingVertical: CONTENT_PADDING_V }]}>
        <TouchableOpacity
          onPress={onBack ?? (() => router.back())}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <FontAwesome name="chevron-left" size={20} color={hex.text} />
        </TouchableOpacity>
        <Text
          style={[styles.detailTitle, { color: hex.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        {trailing != null ? <View style={styles.trailing}>{trailing}</View> : <View style={styles.trailing} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: OVERLAY_HEADER_ROW_HEIGHT,
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headerTrailing: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: OVERLAY_HEADER_ROW_HEIGHT,
    gap: 8,
  },
  backBtn: {
    padding: 4,
    marginLeft: -4,
  },
  detailTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginLeft: 4,
  },
  trailing: {
    minWidth: 32,
    alignItems: 'flex-end',
  },
});
