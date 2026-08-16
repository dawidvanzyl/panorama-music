/**
 * Fills a select with one option per value, labelled with its display text. The
 * create form and the filter bar both offer the same enums, so they share the
 * one loop rather than drifting when an enum grows.
 */
export function appendOptions<T extends string>(
  select: HTMLSelectElement,
  values: T[],
  labels: Record<T, string>,
): void {
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = labels[value];
    select.appendChild(option);
  }
}
