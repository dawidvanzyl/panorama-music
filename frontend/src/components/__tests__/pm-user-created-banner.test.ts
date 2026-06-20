import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmUserCreatedBanner } from '../pm-user-created-banner';

describe('pm-user-created-banner', { tags: ['M1.1UC20'] }, () => {
  let el: PmUserCreatedBanner;

  beforeEach(() => {
    el = new PmUserCreatedBanner();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('is hidden by default', () => {
    expect(el.hasAttribute('visible')).toBe(false);
  });

  it('show() makes the banner visible with "User created successfully" heading', () => {
    el.show('https://panorama.music/invite/abc123');

    expect(el.hasAttribute('visible')).toBe(true);
    const title = el.shadowRoot!.querySelector('.banner__title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('User created successfully');
  });

  it('show() displays the provided invite URL', () => {
    const url = 'https://panorama.music/invite/abc123';
    el.show(url);

    const urlEl = el.shadowRoot!.getElementById('inviteUrl');
    expect(urlEl).not.toBeNull();
    expect(urlEl!.textContent).toBe(url);
  });

  it('renders a "Copy Link" button', () => {
    el.show('https://panorama.music/invite/abc123');

    const copyBtn = el.shadowRoot!.getElementById('copyBtn');
    expect(copyBtn).not.toBeNull();
    expect(copyBtn!.textContent).toContain('Copy Link');
  });

  it('hide() removes the visible attribute', () => {
    el.show('https://panorama.music/invite/abc123');
    el.hide();

    expect(el.hasAttribute('visible')).toBe(false);
  });
});
