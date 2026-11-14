function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * When a bill was last changed, in the viewer's own time zone: "Today, 7:42 PM",
 * "14 Nov", or "14 Nov 2025" for an earlier year.
 */
export function formatUpdatedAt(iso: string, now: Date = new Date(), locale?: string): string {
  const at = new Date(iso);
  if (isSameDay(at, now)) {
    const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(at);
    return `Today, ${time}`;
  }
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: at.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(at);
}
