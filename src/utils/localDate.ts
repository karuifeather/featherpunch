function toDate(input: Date | string): Date {
  return input instanceof Date ? new Date(input.getTime()) : new Date(input);
}

export function getLocalDayKey(input: Date | string): string {
  const date = toDate(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(input: Date | string): Date {
  const date = toDate(input);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

export function endOfLocalDay(input: Date | string): Date {
  const date = toDate(input);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

export function startOfNextLocalDay(input: Date | string): Date {
  const start = startOfLocalDay(input);
  return new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 1,
    0,
    0,
    0,
    0,
  );
}

export function formatLocalDayLabel(input: Date | string): string {
  const date = toDate(input);
  const todayStart = startOfLocalDay(new Date());
  const targetStart = startOfLocalDay(date);
  const diffDays = Math.round(
    (targetStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === -1) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
