import React from 'react';
import { View, Text } from 'react-native';
import { TAG_COLORS } from '@/constants/designTokens';
import type { RoleTag } from '@/types';

interface TagIndicatorProps {
  tag: RoleTag;
  /** Show "For me" / "For others" label next to the dot */
  showLabel?: boolean;
  /** Dot size: sm = 8, md = 10 */
  size?: 'sm' | 'md';
}

/** Color-coded indicator for role tag (For me / For others). Use across the app for consistent tag UI. */
export function TagIndicator({ tag, showLabel = false, size = 'md' }: TagIndicatorProps) {
  const color = TAG_COLORS[tag];
  const dotSize = size === 'sm' ? 8 : 10;
  const label = tag === 'me' ? 'For me' : 'For others';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
        }}
      />
      {showLabel && (
        <Text style={{ fontSize: 12, fontWeight: '500', color }}>
          {label}
        </Text>
      )}
    </View>
  );
}

/** Get the hex color for a role tag (for use in custom UI). */
export function getTagColor(tag: RoleTag): string {
  return TAG_COLORS[tag];
}
