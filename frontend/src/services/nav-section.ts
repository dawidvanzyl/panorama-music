export type NavSection = 'dashboard' | 'admin';

let activeSection: NavSection = 'dashboard';

export function getActiveNavSection(): NavSection {
  return activeSection;
}

export function updateActiveNavSection(basePath: string): NavSection {
  if (basePath.startsWith('/admin')) {
    activeSection = 'admin';
  } else if (basePath === '/') {
    activeSection = 'dashboard';
  }
  return activeSection;
}
