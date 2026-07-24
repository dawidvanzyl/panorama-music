export type NavSection = 'dashboard' | 'admin' | 'students';

let activeSection: NavSection = 'dashboard';

export function getActiveNavSection(): NavSection {
  return activeSection;
}

export function updateActiveNavSection(basePath: string): NavSection {
  if (basePath.startsWith('/admin')) {
    activeSection = 'admin';
  } else if (basePath.startsWith('/students')) {
    activeSection = 'students';
  } else if (basePath === '/') {
    activeSection = 'dashboard';
  }
  return activeSection;
}
