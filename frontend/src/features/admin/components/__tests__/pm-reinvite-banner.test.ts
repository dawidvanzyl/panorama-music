import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmReinviteBanner } from '../pm-reinvite-banner';

describe('pm-reinvite-banner', { tags: ['M1.1UC21'] }, () => {
  let el: PmReinviteBanner;

  beforeEach(() => {
    el = new PmReinviteBanner();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('is hidden by default', () => {
    expect(el.hasAttribute('visible')).toBe(false);
  });

  it('show() makes the banner visible with "Invite Regenerated Successfully" heading', () => {
    el.show('https://panorama.music/invite/new-token');

    expect(el.hasAttribute('visible')).toBe(true);
    const title = el.shadowRoot!.querySelector('.banner__title');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('Invite Regenerated Successfully');
  });

  it('show() displays the provided invite URL', () => {
    const url = 'https://panorama.music/invite/new-token';
    el.show(url);

    const urlEl = el.shadowRoot!.getElementById('inviteUrl');
    expect(urlEl).not.toBeNull();
    expect(urlEl!.textContent).toBe(url);
  });

  it('renders a "Copy Link" button', () => {
    el.show('https://panorama.music/invite/new-token');

    const copyBtn = el.shadowRoot!.getElementById('copyBtn');
    expect(copyBtn).not.toBeNull();
    expect(copyBtn!.textContent).toContain('Copy Link');
  });

  it('hide() removes the visible attribute', () => {
    el.show('https://panorama.music/invite/new-token');
    el.hide();

    expect(el.hasAttribute('visible')).toBe(false);
  });
});
