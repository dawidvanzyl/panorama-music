export type NavSection = 'dashboard' | 'admin' | 'students';

let activeSection: NavSection = 'dashboard';

export function getActiveNavSection(): NavSection {
  return activeSection;
}

export function updateActiveNavSection(basePath: string): NavSection {
  if (basePath.startsWith('/admin')) {
    activeSection = 'admin';
    // Teacher Management is a Students-section screen — it has no section of
    // its own, so /teachers routes keep the Students sidebar open.
  } else if (basePath.startsWith('/students') || basePath.startsWith('/teachers')) {
    activeSection = 'students';
  } else if (basePath === '/') {
    activeSection = 'dashboard';
  }
  return activeSection;
}
