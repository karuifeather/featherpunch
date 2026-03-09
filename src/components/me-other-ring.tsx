import React from 'react';
import { View, Text } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import Svg, { Circle } from 'react-native-svg';
import { TAG_COLORS } from '@/constants/designTokens';

interface MeOtherRingProps {
  mePercent: number;
  size?: number;
  strokeWidth?: number;
}

/** Ring chart for me vs other split. Uses app TAG_COLORS for consistency. */
export function MeOtherRing({ mePercent, size = 100, strokeWidth = 8 }: MeOtherRingProps) {
  const { hex } = useThemeColors();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const meArc = (mePercent / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={TAG_COLORS.other}
            strokeWidth={strokeWidth}
            fill="none"
            opacity={0.3}
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={TAG_COLORS.me}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${meArc} ${circumference - meArc}`}
            strokeDashoffset={circumference * 0.25}
            strokeLinecap="round"
          />
        </Svg>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: '700', color: hex.text }}>
            {mePercent}%
          </Text>
          <Text style={{ fontSize: 11, color: hex.textSecondary, marginTop: 1 }}>
            yours
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TAG_COLORS.me }} />
          <Text style={{ fontSize: 12, fontWeight: '500', color: TAG_COLORS.me }}>For me</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TAG_COLORS.other }} />
          <Text style={{ fontSize: 12, fontWeight: '500', color: TAG_COLORS.other }}>For others</Text>
        </View>
      </View>
    </View>
  );
}
