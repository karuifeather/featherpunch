export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${m}:${pad(s)}`;
}

export function formatDurationShort(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${pad(m)} ${period}`;
}

/** For active state: "Since 7:09 PM" */
export function formatSinceTime(isoString: string): string {
  return `Since ${formatTime(isoString)}`;
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateFull(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isToday(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isYesterday(isoString: string): boolean {
  const d = new Date(isoString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  );
}

export function getDayLabel(isoString: string): string {
  if (isToday(isoString)) return 'Today';
  if (isYesterday(isoString)) return 'Yesterday';
  return formatDate(isoString);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Get minutes since midnight (local) from an ISO string. */
export function getMinutesSinceMidnight(isoString: string): number {
  const d = new Date(isoString);
  return d.getHours() * 60 + d.getMinutes();
}

/** Build ISO string from local date (y,m,d) and minutes since midnight. */
export function isoFromLocalDateAndMinutes(
  year: number,
  month: number,
  day: number,
  minutesSinceMidnight: number
): string {
  const h = Math.floor(minutesSinceMidnight / 60);
  const m = minutesSinceMidnight % 60;
  const d = new Date(year, month, day, h, m, 0, 0);
  return d.toISOString();
}
