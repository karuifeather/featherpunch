export function generateId(): string {
  const hex = "0123456789abcdef";
  const segments = [8, 4, 4, 4, 12];
  return segments
    .map((len) =>
      Array.from(
        { length: len },
        () => hex[Math.floor(Math.random() * 16)],
      ).join(""),
    )
    .join("-");
}
