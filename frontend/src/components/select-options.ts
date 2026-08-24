/**
 * Fills a select with one option per value, labelled with its display text. A
 * create form and a filter bar offer the same enums, so they share the one loop
 * rather than drifting when an enum grows. It carries no domain meaning, which
 * is why it sits here rather than inside the first feature that needed it.
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
