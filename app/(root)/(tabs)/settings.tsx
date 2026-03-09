import React, { useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faMoon,
  faSun,
  faMobile,
  faFileExport,
  faInfoCircle,
  faFileImport,
} from '@fortawesome/free-solid-svg-icons';
import { RootState } from '@/state/store';
import { setTheme, type ThemeMode } from '@/state/settingsSlice';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useEdgeToEdgeInsets } from '@/hooks/useEdgeToEdgeInsets';
import { useRoles } from '@/hooks/useRoles';
import { OverlayHeader } from '@/components/overlay-header';
import { ExportModal } from '@/components/export-modal';
import { TYPOGRAPHY, RADIUS } from '@/constants/designTokens';
import * as demoSeed from '@/seed/demoSeed';

const SECTION_HEADER_MARGIN_TOP = 18;
const SECTION_HEADER_MARGIN_BOTTOM = 8;

function SectionHeader({
  label,
  first,
}: {
  label: string;
  first?: boolean;
}) {
  const { hex } = useThemeColors();
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: hex.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: SECTION_HEADER_MARGIN_BOTTOM,
        marginTop: first ? 0 : SECTION_HEADER_MARGIN_TOP,
      }}
    >
      {label}
    </Text>
  );
}

function SettingsRow({
  label,
  onPress,
  icon,
  iconColor,
  rightLabel,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  iconColor?: string;
  rightLabel?: string;
  disabled?: boolean;
}) {
  const { hex } = useThemeColors();
  const content = (
    <>
      {icon != null && (
        <View style={{ width: 22, alignItems: 'center' }}>
          {icon}
        </View>
      )}
      <Text
        style={{
          flex: 1,
          fontSize: 16,
          color: disabled ? hex.textTertiary : hex.text,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      {rightLabel != null && (
        <Text
          style={{ fontSize: 15, color: hex.textTertiary }}
          numberOfLines={1}
        >
          {rightLabel}
        </Text>
      )}
    </>
  );
  const rowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 44,
  };
  if (disabled || !onPress) {
    return <View style={rowStyle}>{content}</View>;
  }
  return (
    <TouchableOpacity onPress={onPress} style={rowStyle} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

function GroupCard({ children }: { children: React.ReactNode }) {
  const { hex } = useThemeColors();
  return (
    <View
      style={{
        backgroundColor: hex.surface,
        borderRadius: RADIUS.card,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: hex.border,
      }}
    >
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const theme = useSelector((state: RootState) => state.settings.theme);
  const { bg, hex } = useThemeColors();
  const { overlayHeaderHeight, tabBarHeight } = useEdgeToEdgeInsets();
  const { roles, refresh: refreshRoles } = useRoles(true);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  const runDemoAction = async (
    label: string,
    fn: () => Promise<void>
  ) => {
    try {
      await fn();
      refreshRoles();
      Alert.alert('Demo data', `${label}. Open Home or Insights to see it.`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  return (
    <View className={`flex-1 ${bg}`}>
      <ScrollView
        className={`flex-1 ${bg}`}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: overlayHeaderHeight + 16,
          paddingBottom: tabBarHeight + 32,
        }}
      >
        <SectionHeader label="Appearance" first />
        <GroupCard>
          <View
            style={{
              flexDirection: 'row',
              padding: 10,
              gap: 8,
            }}
          >
            {(['dark', 'light', 'system'] as ThemeMode[]).map((t) => {
              const selected = theme === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => dispatch(setTheme(t))}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: RADIUS.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? hex.border : 'transparent',
                  }}
                  activeOpacity={0.8}
                >
                  {t === 'dark' && (
                    <FontAwesomeIcon
                      icon={faMoon}
                      color={selected ? hex.text : hex.textTertiary}
                      size={14}
                    />
                  )}
                  {t === 'light' && (
                    <FontAwesomeIcon
                      icon={faSun}
                      color={selected ? hex.text : hex.textTertiary}
                      size={14}
                    />
                  )}
                  {t === 'system' && (
                    <FontAwesomeIcon
                      icon={faMobile}
                      color={selected ? hex.text : hex.textTertiary}
                      size={14}
                    />
                  )}
                  <Text
                    style={{
                      marginLeft: 6,
                      fontSize: 13,
                      fontWeight: selected ? '600' : '500',
                      color: selected ? hex.text : hex.textSecondary,
                    }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GroupCard>

        <SectionHeader label="Data" />
        <GroupCard>
          <View style={{ borderBottomWidth: 1, borderBottomColor: hex.border }}>
            <SettingsRow
              label="Export role log"
              onPress={() => setExportModalVisible(true)}
              icon={
                <FontAwesomeIcon
                  icon={faFileExport}
                  color={hex.textSecondary}
                  size={18}
                />
              }
            />
          </View>
          <SettingsRow
            label="Import CSV"
            rightLabel="Coming soon"
            icon={
              <FontAwesomeIcon
                icon={faFileImport}
                color={hex.textTertiary}
                size={18}
              />
            }
            disabled
          />
        </GroupCard>

        {__DEV__ && (
          <>
            <SectionHeader label="Demo data (screenshots)" />
            <GroupCard>
              <View style={{ borderBottomWidth: 1, borderBottomColor: hex.border }}>
                <SettingsRow
                  label="Load landing (default)"
                  onPress={() => runDemoAction('Landing default loaded', demoSeed.loadLandingDefault)}
                />
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: hex.border }}>
                <SettingsRow
                  label="Load landing (active)"
                  onPress={() => runDemoAction('Landing active loaded', demoSeed.loadLandingActive)}
                />
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: hex.border }}>
                <SettingsRow
                  label="Load landing (ready)"
                  onPress={() => runDemoAction('Landing ready loaded', demoSeed.loadLandingReady)}
                />
              </View>
              <SettingsRow
                label="Clear demo data"
                onPress={() => runDemoAction('All data cleared', demoSeed.clearDemoData)}
              />
            </GroupCard>
          </>
        )}

        <SectionHeader label="About" />
        <View
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: hex.text,
            }}
          >
            FeatherPunch
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: hex.textSecondary,
              marginTop: 4,
              lineHeight: 20,
            }}
          >
            See where your time goes.
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: hex.textTertiary,
              marginTop: 6,
              lineHeight: 18,
            }}
          >
            Local-first. No accounts. Your data stays on your device.
          </Text>
        </View>

        <ExportModal
          visible={exportModalVisible}
          onClose={() => setExportModalVisible(false)}
          roles={roles}
        />
      </ScrollView>
      <OverlayHeader title="Settings" />
    </View>
  );
}
