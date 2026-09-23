/**
 * `yyyy-MM-dd HH:mm` in local time (R6, supersedes R5 — no locale month
 * names, no three-letter month table). Applies to every Reporting date
 * display (#317–#322), not only the results page's "Last run" sub-line.
 */
export function formatReportDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
