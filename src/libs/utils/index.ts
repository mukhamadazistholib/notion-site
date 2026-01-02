export function formatDateTime(
  input: Date | string,
  locale = "en-US",
  timeZone = "Asia/Jakarta"
): string {
  const date = typeof input === "string" ? new Date(input) : input;

  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const map = Object.fromEntries(
    parts.map((p) => [p.type, p.value])
  );

  return `${map.day} ${map.month} ${map.year}, ${map.hour}:${map.minute}:${map.second} ${map.dayPeriod}`;
}
