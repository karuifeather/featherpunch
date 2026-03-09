import type { RoleTag } from '@/types';

export interface RolePreset {
  name: string;
  icon: string;
  color: string;
  tag: RoleTag;
}

export const DEFAULT_ROLE_PRESETS: RolePreset[] = [
  { name: 'Work', icon: 'briefcase', color: '#f59e0b', tag: 'other' },
];

export const ROLE_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#64748b', '#78716c',
];

export const ROLE_ICONS = [
  'moon', 'sun', 'briefcase', 'book-open', 'dumbbell',
  'users', 'hammer', 'car', 'coffee', 'smartphone',
  'heart', 'music', 'palette', 'code', 'pen-tool',
  'gamepad-2', 'utensils', 'shower-head', 'baby',
  'dog', 'plane', 'shopping-bag', 'tv', 'zap',
];
