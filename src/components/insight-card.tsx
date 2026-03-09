import React from 'react';
import { View, Text } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { RADIUS, TYPOGRAPHY } from '@/constants/designTokens';
import type { InsightCard as InsightCardType } from '@/types';

const TYPE_COLORS = {
  neutral: '#71717a',
  positive: '#22c55e',
  reflective: '#64748b',
  warning: '#d97706',
};

interface InsightCardProps {
  insight: InsightCardType;
}

/** Editorial, minimal. No italics, flat styling. */
export function InsightCard({ insight }: InsightCardProps) {
  const { hex } = useThemeColors();
  const accentColor = TYPE_COLORS[insight.type];

  return (
    <View
      style={{
        backgroundColor: hex.surface,
        borderRadius: RADIUS.card,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: hex.border,
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
      }}
    >
      <Text
        style={{
          ...TYPOGRAPHY.body,
          color: hex.text,
        }}
      >
        {insight.text}
      </Text>
    </View>
  );
}
