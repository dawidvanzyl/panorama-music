/**
 * The registry of caches that belong to a signed-in session rather than to the
 * tab. Feature services register their own clear function here; clearing the
 * tokens clears all of them.
 *
 * A session ends in more places than the logout button — an expired refresh
 * token, a 401 on any call — and none of those reload the page, so a cache left
 * behind would be served to whoever signs in next on the same tab.
 */
const clearers = new Set<() => void>();

export function registerSessionCache(clear: () => void): void {
  clearers.add(clear);
}

export function clearSessionCaches(): void {
  for (const clear of clearers) clear();
}
