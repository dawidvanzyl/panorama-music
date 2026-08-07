import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../pm-teacher-create-section';
import type { PmTeacherCreateSection } from '../pm-teacher-create-section';

function shadowOf(el: PmTeacherCreateSection): ShadowRoot {
  return el.shadowRoot!;
}

describe('pm-teacher-create-section — validation', { tags: ['231UC9'] }, () => {
  let el: PmTeacherCreateSection;
  let requestedHandler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    el = document.createElement('pm-teacher-create-section') as PmTeacherCreateSection;
    document.body.appendChild(el);
    requestedHandler = vi.fn();
    el.addEventListener('teacher-create-requested', requestedHandler as EventListener);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('shows validation messages and dispatches no create request when first name and surname are blank', () => {
    const saveBtn = shadowOf(el).getElementById('saveBtn') as HTMLButtonElement;

    saveBtn.click();

    expect(shadowOf(el).getElementById('firstNameError')!.textContent).toMatch(/required/i);
    expect(shadowOf(el).getElementById('surnameError')!.textContent).toMatch(/required/i);
    expect(requestedHandler).not.toHaveBeenCalled();
  });

  it('dispatches a create request with the entered values once both fields are filled', () => {
    const firstNameInput = shadowOf(el).getElementById('firstName') as HTMLInputElement;
    const surnameInput = shadowOf(el).getElementById('surname') as HTMLInputElement;
    const saveBtn = shadowOf(el).getElementById('saveBtn') as HTMLButtonElement;

    firstNameInput.value = 'Naomi';
    surnameInput.value = 'Fischer';
    saveBtn.click();

    expect(requestedHandler).toHaveBeenCalledTimes(1);
    const detail = (requestedHandler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.input).toEqual({
      firstName: 'Naomi',
      surname: 'Fischer',
      isPrivate: false,
      linkedAccountId: null,
    });
  });

  it('carries the private flag through as a boolean when the switch is on', () => {
    const shadow = shadowOf(el);
    (shadow.getElementById('firstName') as HTMLInputElement).value = 'Naomi';
    (shadow.getElementById('surname') as HTMLInputElement).value = 'Fischer';

    const toggle = shadow.getElementById('private') as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    (shadow.getElementById('saveBtn') as HTMLButtonElement).click();

    const detail = (requestedHandler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.input.isPrivate).toBe(true);
    expect(shadow.getElementById('toggleHelp')!.textContent).toBe('Paid directly by parents.');
  });

  it('renders the private flag as a sliding switch over a real native checkbox', () => {
    const shadow = shadowOf(el);
    const toggle = shadow.getElementById('private') as HTMLInputElement;

    expect(toggle.type).toBe('checkbox');
    expect(toggle.classList.contains('toggle__input')).toBe(true);
    expect(toggle.parentElement!.querySelector('.toggle__track .toggle__thumb')).not.toBeNull();
  });
});

describe('pm-teacher-create-section — always inline on the same screen', { tags: ['231UC11'] }, () => {
  let el: PmTeacherCreateSection;

  beforeEach(() => {
    el = document.createElement('pm-teacher-create-section') as PmTeacherCreateSection;
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('is visible inline as soon as it renders, with no overlay and no navigation', () => {
    const hashBefore = window.location.hash;

    expect(el.hidden).toBe(false);
    expect(shadowOf(el).querySelector('dialog')).toBeNull();
    expect(el.shadowRoot!.host.closest('dialog')).toBeNull();
    expect(window.location.hash).toBe(hashBefore);
  });

  it('offers Create Teacher as its only action — there is no cancel affordance', () => {
    const shadow = shadowOf(el);

    expect(shadow.getElementById('cancelBtn')).toBeNull();
    expect(shadow.getElementById('saveBtn')!.textContent).toBe('Create Teacher');
  });

  it('reset() clears the form and leaves the section on screen for the next teacher', () => {
    const shadow = shadowOf(el);
    const firstName = shadow.getElementById('firstName') as HTMLInputElement;
    const surname = shadow.getElementById('surname') as HTMLInputElement;
    const toggle = shadow.getElementById('private') as HTMLInputElement;

    firstName.value = 'Naomi';
    surname.value = 'Fischer';
    toggle.checked = true;

    el.reset();

    expect(firstName.value).toBe('');
    expect(surname.value).toBe('');
    expect(toggle.checked).toBe(false);
    expect(el.hidden).toBe(false);
  });
});
