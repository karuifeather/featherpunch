import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OVERLAY_HEADER_CONTENT_HEIGHT } from '@/components/overlay-header';

/** Base height of the tab bar (icons + padding), before adding bottom safe inset. */
export const TAB_BAR_BASE_HEIGHT = 56;

/**
 * Returns safe-area insets and derived values for edge-to-edge layouts.
 * Use for content padding so scroll content doesn't sit under overlay header/tab bar,
 * while the scroll view itself is full-bleed.
 */
export function useEdgeToEdgeInsets() {
  const insets = useSafeAreaInsets();

  return useMemo(
    () => ({
      ...insets,
      /** Total height of the bottom tab bar (base + safe area). Use for ScrollView contentContainerStyle paddingBottom. */
      tabBarHeight: TAB_BAR_BASE_HEIGHT + insets.bottom,
      /** Full overlay header height (status bar + header content). Use for screens where content must clear full header. */
      overlayHeaderHeight: insets.top + OVERLAY_HEADER_CONTENT_HEIGHT,
      /** Header content height only (minus status bar). */
      overlayHeaderRowHeight: OVERLAY_HEADER_CONTENT_HEIGHT,
    }),
    [insets.top, insets.bottom, insets.left, insets.right]
  );
}
