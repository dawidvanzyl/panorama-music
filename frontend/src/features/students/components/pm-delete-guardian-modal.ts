import { modalChromeStyles } from '../../../components/modal-chrome-styles';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .modal__name {
      color: var(--pm-text, #e2e1ed);
      font-weight: 500;
    }
    .modal__btn--delete {
      background: var(--pm-danger, #e05252);
      border: 1px solid var(--pm-danger, #e05252);
      color: #fff;
    }
    .modal__btn--delete:hover:not(:disabled) {
      opacity: 0.9;
    }
    .modal__scope-choice {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: var(--pm-modal-body-gap, 16px);
    }
    .modal__scope-choice[hidden] {
      display: none;
    }
    .modal__scope-option {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13px;
      color: var(--pm-text);
      cursor: pointer;
    }
    .modal__scope-option input {
      margin-top: 3px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card">
      <div class="modal__header">
        <span class="modal__icon">delete_forever</span>
        <h2 class="modal__title">Delete Guardian</h2>
      </div>
      <p class="modal__body" id="plainBody">
        This action <strong>cannot be undone</strong>. The record for <span class="modal__name" id="modalNamePlain"></span> will be permanently removed.
      </p>
      <p class="modal__body" id="restrictedBody" hidden>
        <span class="modal__name" id="modalNameRestricted"></span> is shared with an enrolled student, so the record itself cannot be removed here. They will be unlinked from this student only.
      </p>
      <div class="modal__scope-choice" id="scopeChoice" hidden>
        <p class="modal__body">
          <span class="modal__name" id="modalNameScoped"></span> is shared with siblings. Choose what to remove:
        </p>
        <label class="modal__scope-option">
          <input type="radio" name="scope" id="scopeOne" value="one" checked />
          Unlink from this student only — the record and other sibling links stay intact.
        </label>
        <label class="modal__scope-option">
          <input type="radio" name="scope" id="scopeAll" value="all" />
          Delete guardian and remove all links — permanently removes the record and every sibling's link to it.
        </label>
      </div>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--delete" id="deleteBtn" type="button">Delete</button>
      </div>
    </div>
  </div>
`;

export type GuardianDeleteScope = 'one' | 'all';

export class PmDeleteGuardianModal extends HTMLElement {
  private _studentId = '';
  private _guardianId = '';
  private _shared = false;
  private _restricted = false;
  private plainBody: HTMLElement | null = null;
  private restrictedBody: HTMLElement | null = null;
  private scopeChoice: HTMLElement | null = null;
  private scopeOneRadio: HTMLInputElement | null = null;
  private scopeAllRadio: HTMLInputElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.plainBody = this.shadowRoot!.getElementById('plainBody') as HTMLElement;
    this.restrictedBody = this.shadowRoot!.getElementById('restrictedBody') as HTMLElement;
    this.scopeChoice = this.shadowRoot!.getElementById('scopeChoice') as HTMLElement;
    this.scopeOneRadio = this.shadowRoot!.getElementById('scopeOne') as HTMLInputElement;
    this.scopeAllRadio = this.shadowRoot!.getElementById('scopeAll') as HTMLInputElement;

    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('deleteBtn')!.addEventListener('click', () => this.handleDelete());
  }

  /**
   * `sharedWithSiblings` must be the definitive answer for this specific
   * guardian (linked to more than one student), not an approximation like
   * "the student has siblings" — the copy states it as fact, not a maybe.
   * <p>
   * `restricted` says the signed-in user may not remove the record itself,
   * which the API refuses. There is then no choice of scope left to offer, so
   * the modal states what will happen instead of presenting an option that
   * would come back rejected.
   * </p>
   */
  show(studentId: string, guardianId: string, name: string, sharedWithSiblings: boolean, restricted = false): void {
    this._studentId = studentId;
    this._guardianId = guardianId;
    this._shared = sharedWithSiblings;
    this._restricted = restricted;
    this.scopeOneRadio!.checked = true;

    this.plainBody!.hidden = sharedWithSiblings || restricted;
    this.restrictedBody!.hidden = !restricted;
    this.scopeChoice!.hidden = !sharedWithSiblings || restricted;
    this.shadowRoot!.getElementById('modalNamePlain')!.textContent = name;
    this.shadowRoot!.getElementById('modalNameScoped')!.textContent = name;
    this.shadowRoot!.getElementById('modalNameRestricted')!.textContent = name;

    this.setAttribute('open', '');
  }

  private close(): void {
    this.removeAttribute('open');
  }

  private handleDelete(): void {
    const scope: GuardianDeleteScope = !this._restricted && this._shared && this.scopeAllRadio!.checked ? 'all' : 'one';

    this.dispatchEvent(
      new CustomEvent('guardian-delete-confirmed', {
        bubbles: true,
        composed: true,
        detail: { studentId: this._studentId, guardianId: this._guardianId, scope },
      }),
    );
    this.close();
  }
}

customElements.define('pm-delete-guardian-modal', PmDeleteGuardianModal);
