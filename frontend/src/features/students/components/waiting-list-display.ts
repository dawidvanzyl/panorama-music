/**
 * How a waiting-list entry's added date-time is spelled for a person. The row's
 * meta line and the edit wizard's read-only Date Added field must agree —
 * a reader comparing the two is looking at the same entry.
 */
export function formatAddedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}
