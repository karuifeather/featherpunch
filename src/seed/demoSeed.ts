/**
 * Curated demo/landing seed data for screenshot-ready app state.
 * Deterministic, human-looking patterns; no overlapping or zero-minute logs.
 *
 * ROLES: Sleeping, Studying, Building, Exercise, Rest (me); Working, Family, Commute (other).
 * RATES: Working 22/hr, Building 15/hr.
 * DATE RANGE: 30 days ending "today" (generated at load time).
 * LIFE SPLIT: ~40% For me, ~60% For others (believable, not extreme).
 *
 * PRESETS:
 * - landing-default: Full 30-day history, no active session. Best for: Insights, Roles, Role detail, Role log.
 * - landing-ready: Same as default (today has sessions so "Recent roles" shows). Best for: Home (ready to clock in).
 * - landing-active: Same history + one active Building session (started 45 min ago). Best for: Home (clocked in).
 */

import * as rolesDb from '@/db/roles';
import * as sessionsDb from '@/db/sessions';
import type { RoleTag } from '@/types';

// Fixed IDs so we can reference roles when generating sessions
export const DEMO_ROLE_IDS = {
  sleeping: 'demo-role-sleeping',
  studying: 'demo-role-studying',
  building: 'demo-role-building',
  exercise: 'demo-role-exercise',
  rest: 'demo-role-rest',
  working: 'demo-role-working',
  family: 'demo-role-family',
  commute: 'demo-role-commute',
} as const;

const DEMO_ROLES: Array<{
  id: string;
  name: string;
  color: string;
  icon: string;
  tag: RoleTag;
  hourlyRate: number | null;
  sortOrder: number;
}> = [
  { id: DEMO_ROLE_IDS.sleeping, name: 'Sleeping', color: '#6366f1', icon: 'moon', tag: 'me', hourlyRate: null, sortOrder: 0 },
  { id: DEMO_ROLE_IDS.studying, name: 'Studying', color: '#3b82f6', icon: 'book-open', tag: 'me', hourlyRate: null, sortOrder: 1 },
  { id: DEMO_ROLE_IDS.building, name: 'Building', color: '#8b5cf6', icon: 'hammer', tag: 'me', hourlyRate: 15, sortOrder: 2 },
  { id: DEMO_ROLE_IDS.exercise, name: 'Exercise', color: '#22c55e', icon: 'dumbbell', tag: 'me', hourlyRate: null, sortOrder: 3 },
  { id: DEMO_ROLE_IDS.rest, name: 'Rest', color: '#14b8a6', icon: 'coffee', tag: 'me', hourlyRate: null, sortOrder: 4 },
  { id: DEMO_ROLE_IDS.working, name: 'Working', color: '#f59e0b', icon: 'briefcase', tag: 'other', hourlyRate: 22, sortOrder: 5 },
  { id: DEMO_ROLE_IDS.family, name: 'Family', color: '#ec4899', icon: 'users', tag: 'other', hourlyRate: null, sortOrder: 6 },
  { id: DEMO_ROLE_IDS.commute, name: 'Commute', color: '#64748b', icon: 'car', tag: 'other', hourlyRate: null, sortOrder: 7 },
];

/** Block within a day: start and end in minutes from midnight (local), role key */
interface DayBlock {
  startMin: number;
  endMin: number;
  roleKey: keyof typeof DEMO_ROLE_IDS;
}

/** Weekday template: realistic blocks, no overlap, no zero-length. ~7.5h sleep, work, study, build, family, rest. */
function getWeekdayBlocks(dayIndex: number): DayBlock[] {
  // Slight variation by day index so not every day is identical (deterministic)
  const v = dayIndex % 5;
  const studyMins = 60 + (v * 15); // 60–120
  const buildMins = 45 + (v * 12); // 45–93
  const workLen = 300 + (v * 10);
  const work2Len = 180 - (v * 5);

  return [
    { startMin: 0, endMin: 450, roleKey: 'sleeping' },           // 7.5h
    { startMin: 450, endMin: 500, roleKey: 'commute' },          // 50m
    { startMin: 500, endMin: 500 + workLen, roleKey: 'working' },
    { startMin: 500 + workLen, endMin: 500 + workLen + 30, roleKey: 'rest' },
    { startMin: 500 + workLen + 30, endMin: 500 + workLen + 30 + work2Len, roleKey: 'working' },
    { startMin: 500 + workLen + 30 + work2Len, endMin: 500 + workLen + 30 + work2Len + 40, roleKey: 'commute' },
    { startMin: 500 + workLen + 30 + work2Len + 40, endMin: 500 + workLen + 30 + work2Len + 40 + 80, roleKey: 'family' },
    { startMin: 500 + workLen + 30 + work2Len + 40 + 80, endMin: 500 + workLen + 30 + work2Len + 40 + 80 + studyMins, roleKey: 'studying' },
    { startMin: 500 + workLen + 30 + work2Len + 40 + 80 + studyMins, endMin: 500 + workLen + 30 + work2Len + 40 + 80 + studyMins + buildMins, roleKey: 'building' },
    { startMin: 500 + workLen + 30 + work2Len + 40 + 80 + studyMins + buildMins, endMin: 1380, roleKey: 'rest' }, // to 23:00
  ];
}

/** Weekend: more sleep, less work, more family/rest/building/exercise. Day ends at 23:00. */
function getWeekendBlocks(dayIndex: number): DayBlock[] {
  const v = dayIndex % 4;
  const buildMins = 90 + (v * 25);
  const exerciseMins = 35 + (v * 10);
  const familyMins = 70 + (v * 15);
  const studyMins = 60;
  const afterExercise = 540 + familyMins + buildMins + exerciseMins;
  const afterStudy = afterExercise + studyMins;

  return [
    { startMin: 0, endMin: 480, roleKey: 'sleeping' },
    { startMin: 480, endMin: 540, roleKey: 'rest' },
    { startMin: 540, endMin: 540 + familyMins, roleKey: 'family' },
    { startMin: 540 + familyMins, endMin: 540 + familyMins + buildMins, roleKey: 'building' },
    { startMin: 540 + familyMins + buildMins, endMin: afterExercise, roleKey: 'exercise' },
    { startMin: afterExercise, endMin: afterStudy, roleKey: 'studying' },
    { startMin: afterStudy, endMin: 1380, roleKey: 'rest' },
  ];
}

/** Returns blocks for the given calendar day. Uses date's weekday for weekend vs weekday. */
function getBlocksForDay(date: Date, dayIndex: number): DayBlock[] {
  const weekday = date.getDay(); // 0 Sun .. 6 Sat
  const isWeekend = weekday === 0 || weekday === 6;
  const blocks = isWeekend ? getWeekendBlocks(dayIndex) : getWeekdayBlocks(dayIndex);
  return blocks
    .filter((b) => b.endMin > b.startMin && b.endMin <= 1440)
    .sort((a, b) => a.startMin - b.startMin);
}

/** Convert a day (local date) + startMin/endMin to ISO range. */
function blockToIso(date: Date, startMin: number, endMin: number): { startAt: string; endAt: string; durationMs: number } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setMinutes(startMin, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  end.setMinutes(endMin, 0, 0);
  const durationMs = end.getTime() - start.getTime();
  return {
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    durationMs,
  };
}

/** Generate 30 days of completed sessions ending on anchorDate (anchorDate = "today"). */
function generateDemoSessions(anchorDate: Date): Array<{ id: string; roleId: string; startAt: string; endAt: string; durationMs: number }> {
  const out: Array<{ id: string; roleId: string; startAt: string; endAt: string; durationMs: number }> = [];
  let sessionIndex = 0;

  for (let dayIndex = 0; dayIndex < 30; dayIndex++) {
    const date = new Date(anchorDate);
    date.setDate(date.getDate() - (29 - dayIndex));
    date.setHours(0, 0, 0, 0);

    const blocks = getBlocksForDay(date, dayIndex);
    for (const block of blocks) {
      const { startAt, endAt, durationMs } = blockToIso(date, block.startMin, block.endMin);
      if (durationMs < 60_000) continue; // skip any < 1 min
      const roleId = DEMO_ROLE_IDS[block.roleKey];
      out.push({
        id: `demo-session-${sessionIndex}`,
        roleId,
        startAt,
        endAt,
        durationMs,
      });
      sessionIndex++;
    }
  }

  return out;
}

/** Clear all data (roles + sessions). Use before loading demo. */
export async function clearDemoData(): Promise<void> {
  await sessionsDb.deleteAllSessions();
  await rolesDb.deleteAllRoles();
}

/** Load demo roles and 30 days of completed sessions. No active session. */
export async function loadLandingDefault(): Promise<void> {
  await clearDemoData();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const r of DEMO_ROLES) {
    await rolesDb.insertRoleRaw(r);
  }

  const sessions = generateDemoSessions(today);
  for (const s of sessions) {
    await sessionsDb.insertSessionRaw({
      id: s.id,
      roleId: s.roleId,
      startAt: s.startAt,
      endAt: s.endAt,
      durationMs: s.durationMs,
      source: 'manual',
    });
  }
}

/** Same as default: full history, no active session. Today already has sessions so "Recent roles" shows. */
export async function loadLandingReady(): Promise<void> {
  await loadLandingDefault();
}

/** Full history + one active Building session started 45 minutes ago. */
export async function loadLandingActive(): Promise<void> {
  await loadLandingDefault();

  const startAt = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  await sessionsDb.insertActiveSessionRaw({
    id: 'demo-session-active-building',
    roleId: DEMO_ROLE_IDS.building,
    startAt,
  });
}
