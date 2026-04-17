export function toUtcDateTime(localDateTime: string) {
  if (!localDateTime) return null;

  const normalized = localDateTime.trim();
  if (!normalized) return null;

  const [datePart, timePart] = normalized.split("T");
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

export function fromUtcDateTime(date: Date | string | null | undefined) {
  if (!date) return "";

  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "";

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Lagos",
  })
    .format(value)
    .replace(" ", "T");
}
