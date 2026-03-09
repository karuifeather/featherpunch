import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { RoleIcon } from '@/components/role-icon';
import { AppModal } from '@/components/app-modal';
import { RADIUS, ACCENT } from '@/constants/designTokens';
import type { Role } from '@/types';

interface RolePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (roleId: string) => void;
  roles: Role[];
  recentRoleIds?: string[];
  selectedRoleId?: string;
}

const GRID_GAP = 10;
const CARD_ICON_SIZE = 44;
const RECENT_AVATAR_SIZE = 36;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PAD = 20;
const CARD_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - GRID_GAP) / 2;

/** Role picker: Recent row + grid of role cards. Premium, scannable, intentional. */
export function RolePickerModal({
  visible,
  onClose,
  onSelect,
  roles,
  recentRoleIds = [],
  selectedRoleId,
}: RolePickerModalProps) {
  const { hex } = useThemeColors();
  const [search, setSearch] = useState('');

  const recentRoles = useMemo(() => {
    const recent = roles.filter((r) => recentRoleIds.includes(r.id));
    if (!search.trim()) return recent;
    const q = search.trim().toLowerCase();
    return recent.filter((r) => r.name.toLowerCase().includes(q));
  }, [roles, recentRoleIds, search]);

  const listRoles = useMemo(() => {
    const filtered = search.trim()
      ? roles.filter((r) =>
          r.name.toLowerCase().includes(search.trim().toLowerCase())
        )
      : roles;
    return recentRoles.length > 0
      ? filtered.filter((r) => !recentRoleIds.includes(r.id))
      : filtered;
  }, [roles, recentRoleIds, recentRoles.length, search]);

  const handleSelect = (roleId: string) => {
    onSelect(roleId);
    onClose();
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Choose role"
    >
      <View style={[styles.searchBar, { backgroundColor: hex.surface }]}>
        <Ionicons
          name="search-outline"
          size={18}
          color={hex.textTertiary}
          style={styles.searchIcon}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search"
          placeholderTextColor={hex.textTertiary}
          style={[styles.searchInput, { color: hex.text }]}
        />
      </View>

      <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {recentRoles.length > 0 && (
              <View style={styles.recentBlock}>
                <Text style={[styles.sectionLabel, { color: hex.textTertiary }]}>
                  Recent
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentRow}
                >
                  {recentRoles.map((role) => (
                    <RecentAvatar
                      key={role.id}
                      role={role}
                      selected={selectedRoleId === role.id}
                      onPress={() => handleSelect(role.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.gridBlock}>
              <Text style={[styles.sectionLabel, { color: hex.textTertiary }]}>
                {recentRoles.length > 0 ? 'All roles' : 'Roles'}
              </Text>
              <View style={styles.grid}>
                {listRoles.map((role) => (
                  <RoleCard
                    key={role.id}
                    role={role}
                    selected={selectedRoleId === role.id}
                    onPress={() => handleSelect(role.id)}
                    hex={hex}
                    width={CARD_WIDTH}
                  />
                ))}
              </View>
              {listRoles.length === 0 && (
                <Text style={[styles.empty, { color: hex.textTertiary }]}>
                  No roles match
                </Text>
              )}
            </View>
          </ScrollView>
    </AppModal>
  );
}

function RecentAvatar({
  role,
  selected,
  onPress,
}: {
  role: Role;
  selected: boolean;
  onPress: () => void;
}) {
  const { hex } = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.avatarWrap,
        {
          opacity: pressed ? 0.8 : 1,
          borderColor: selected ? ACCENT.primary : 'transparent',
          borderWidth: selected ? 2 : 0,
        },
      ]}
    >
      <RoleIcon
        icon={role.icon}
        color={role.color}
        size={16}
        bgSize={RECENT_AVATAR_SIZE}
      />
      <Text
        style={[styles.avatarLabel, { color: hex.textSecondary }]}
        numberOfLines={1}
      >
        {role.name}
      </Text>
    </Pressable>
  );
}

function RoleCard({
  role,
  selected,
  onPress,
  hex,
  width,
}: {
  role: Role;
  selected: boolean;
  onPress: () => void;
  hex: Record<string, string>;
  width: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          backgroundColor: hex.surface,
          borderColor: selected ? ACCENT.primary : hex.border,
          borderWidth: selected ? 2 : 1,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.cardIcon}>
        <RoleIcon
          icon={role.icon}
          color={role.color}
          size={20}
          bgSize={CARD_ICON_SIZE}
        />
      </View>
      <Text
        style={[styles.cardName, { color: hex.text }]}
        numberOfLines={2}
      >
        {role.name}
      </Text>
      {selected && (
        <View style={[styles.checkBadge, { backgroundColor: ACCENT.primary }]}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: H_PAD,
    marginBottom: 20,
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingBottom: 32,
  },
  recentBlock: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  recentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarWrap: {
    alignItems: 'center',
    width: RECENT_AVATAR_SIZE + 16,
    borderRadius: RECENT_AVATAR_SIZE / 2 + 8,
    paddingVertical: 4,
  },
  avatarLabel: {
    fontSize: 11,
    marginTop: 6,
    maxWidth: RECENT_AVATAR_SIZE + 20,
  },
  gridBlock: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  card: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  cardIcon: {
    marginBottom: 8,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
  },
});
