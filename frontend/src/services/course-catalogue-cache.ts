/**
 * The registry of caches whose contents are derived from the course catalogue
 * rather than from the catalogue read itself. A feature that caches something
 * the catalogue determines registers its own clear function here, and the
 * service that owns the catalogue clears them all whenever a course is created
 * or removed.
 *
 * Session caches are not enough for this: a session cache is cleared when the
 * signed-in user changes, but a catalogue mutation happens mid-session, in a
 * different feature from the one holding the derived copy. Without this, the
 * lesson structures the waiting list offers would go on excluding a
 * combination whose first instrument course was created moments earlier, until
 * the tab was reloaded.
 */
const clearers = new Set<() => void>();

export function registerCourseCatalogueCache(clear: () => void): void {
  clearers.add(clear);
}

export function clearCourseCatalogueCaches(): void {
  for (const clear of clearers) clear();
}
