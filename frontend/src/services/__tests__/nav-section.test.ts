import { describe, it, expect } from 'vitest';
import { getActiveNavSection, updateActiveNavSection } from '../nav-section';

describe('nav-section', { tags: ['M1.4UC12'] }, () => {
  it('switches to admin when the path is under /admin', () => {
    expect(updateActiveNavSection('/admin/users')).toBe('admin');
    expect(getActiveNavSection()).toBe('admin');
  });

  it('switches to dashboard when the path is exactly /', () => {
    updateActiveNavSection('/admin/users');
    expect(updateActiveNavSection('/')).toBe('dashboard');
    expect(getActiveNavSection()).toBe('dashboard');
  });

  it('keeps the previous section for a path that is neither Dashboard nor Admin', () => {
    updateActiveNavSection('/admin/sessions');
    expect(updateActiveNavSection('/sessions')).toBe('admin');

    updateActiveNavSection('/');
    expect(updateActiveNavSection('/sessions')).toBe('dashboard');
  });
});
