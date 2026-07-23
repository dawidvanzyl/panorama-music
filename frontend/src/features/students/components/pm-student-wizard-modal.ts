import './pm-student-step';
import './pm-siblings-step';
import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import type { StudentResult } from '../services/students';
import type { PmStudentStep } from './pm-student-step';
import type { PmSiblingsStep } from './pm-siblings-step';

type Mode = 'create' | 'edit';
type Step = 'student' | 'siblings';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .modal__card {
      box-sizing: border-box;
      max-width: none;
      width: calc(100% - var(--pm-sidebar-width, 240px) - (2 * var(--pm-content-padding, 1cm)));
      height: 600px;
      display: flex;
      flex-direction: column;
    }
    .modal__header {
      flex-shrink: 0;
    }
    .wizard__tabs {
      display: flex;
      flex-shrink: 0;
      gap: 4px;
      border-bottom: 1px solid var(--pm-border, #2e3250);
      margin-bottom: 20px;
    }
    .wizard__tab {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      color: var(--pm-text-muted, #9194a6);
      cursor: pointer;
    }
    .wizard__tab--active {
      color: var(--pm-accent);
      border-bottom-color: var(--pm-accent);
    }
    .wizard__tab:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .wizard__step {
      display: none;
      min-height: 0;
    }
    .wizard__step--visible {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }
    .wizard__step--visible > * {
      flex: 1;
      min-height: 0;
    }
    .wizard__actions {
      display: flex;
      flex-shrink: 0;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
    .wizard__btn {
      height: 44px;
      padding: 0 24px;
      border-radius: var(--pm-radius);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .wizard__btn--cancel {
      background: transparent;
      border: 1px solid var(--pm-border);
      color: var(--pm-text);
    }
    .wizard__btn--secondary {
      background: transparent;
      border: 1px solid var(--pm-border);
      color: var(--pm-text);
    }
    .wizard__btn--primary {
      border: none;
      background: var(--pm-accent);
      color: #fff;
    }
    .wizard__btn[hidden] {
      display: none;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card">
      <div class="modal__header">
        <h2 class="modal__title" id="title">Create Student</h2>
      </div>
      <div class="wizard__tabs" role="tablist">
        <button type="button" class="wizard__tab wizard__tab--active" id="tabStudent" role="tab" aria-selected="true" aria-controls="stepStudent">Student</button>
        <button type="button" class="wizard__tab" id="tabSiblings" role="tab" aria-selected="false" aria-controls="stepSiblings">Siblings</button>
      </div>
      <div class="wizard__step wizard__step--visible" id="stepStudent" role="tabpanel" aria-labelledby="tabStudent">
        <pm-student-step id="studentStep"></pm-student-step>
      </div>
      <div class="wizard__step" id="stepSiblings" role="tabpanel" aria-labelledby="tabSiblings">
        <pm-siblings-step id="siblingsStep"></pm-siblings-step>
      </div>
      <div class="wizard__actions">
        <button type="button" class="wizard__btn wizard__btn--cancel" id="cancelBtn">Cancel</button>
        <button type="button" class="wizard__btn wizard__btn--secondary" id="previousBtn" hidden>Previous</button>
        <button type="button" class="wizard__btn wizard__btn--primary" id="nextBtn" hidden>Next</button>
        <button type="button" class="wizard__btn wizard__btn--primary" id="saveBtn" hidden>Save</button>
      </div>
    </div>
  </div>
`;

export class PmStudentWizardModal extends HTMLElement {
  private titleEl: HTMLElement | null = null;
  private tabStudent: HTMLButtonElement | null = null;
  private tabSiblings: HTMLButtonElement | null = null;
  private stepStudentEl: HTMLElement | null = null;
  private stepSiblingsEl: HTMLElement | null = null;
  private studentStep: PmStudentStep | null = null;
  private siblingsStep: PmSiblingsStep | null = null;
  private cancelBtn: HTMLButtonElement | null = null;
  private previousBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;

  private _mode: Mode = 'create';
  private _activeStep: Step = 'student';
  private _studentId: string | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.titleEl = this.shadowRoot!.getElementById('title') as HTMLElement;
    this.tabStudent = this.shadowRoot!.getElementById('tabStudent') as HTMLButtonElement;
    this.tabSiblings = this.shadowRoot!.getElementById('tabSiblings') as HTMLButtonElement;
    this.stepStudentEl = this.shadowRoot!.getElementById('stepStudent') as HTMLElement;
    this.stepSiblingsEl = this.shadowRoot!.getElementById('stepSiblings') as HTMLElement;
    this.studentStep = this.shadowRoot!.getElementById('studentStep') as unknown as PmStudentStep;
    this.siblingsStep = this.shadowRoot!.getElementById('siblingsStep') as unknown as PmSiblingsStep;
    this.cancelBtn = this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement;
    this.previousBtn = this.shadowRoot!.getElementById('previousBtn') as HTMLButtonElement;
    this.nextBtn = this.shadowRoot!.getElementById('nextBtn') as HTMLButtonElement;
    this.saveBtn = this.shadowRoot!.getElementById('saveBtn') as HTMLButtonElement;

    this.tabStudent.addEventListener('click', () => this.goToStep('student'));
    this.tabSiblings.addEventListener('click', () => this.handleSiblingsTabClick());
    this.cancelBtn.addEventListener('click', () => this.close());
    this.previousBtn.addEventListener('click', () => this.goToStep('student'));
    this.nextBtn.addEventListener('click', () => this.handleNext());
    this.saveBtn.addEventListener('click', () => this.handleSave());
  }

  openForCreate(candidates: StudentResult[]): void {
    this._mode = 'create';
    this._studentId = null;
    this.titleEl!.textContent = 'Create Student';
    this.studentStep!.reset();
    this.siblingsStep!.activateForCreate(candidates);
    this.saveBtn!.disabled = false;
    this.goToStep('student');
    this.setAttribute('open', '');
  }

  openForEdit(student: StudentResult): void {
    this._mode = 'edit';
    this._studentId = student.studentId;
    this.titleEl!.textContent = `Edit Student: ${student.firstName} ${student.lastName}`;
    this.studentStep!.setValues(student);
    this.saveBtn!.disabled = false;
    this.goToStep('student');
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
  }

  get studentId(): string | null {
    return this._studentId;
  }

  showStudentError(message: string): void {
    this.studentStep!.showError(message);
    this.saveBtn!.disabled = false;
  }

  showSiblingsError(message: string): void {
    this.siblingsStep!.showError(message);
  }

  set siblings(value: StudentResult[]) {
    this.siblingsStep!.siblings = value;
  }

  set candidates(value: StudentResult[]) {
    this.siblingsStep!.candidates = value;
  }

  private handleSiblingsTabClick(): void {
    if (this._mode === 'create') return;
    this.goToStep('siblings');
  }

  private goToStep(step: Step): void {
    this._activeStep = step;

    this.stepStudentEl!.classList.toggle('wizard__step--visible', step === 'student');
    this.stepSiblingsEl!.classList.toggle('wizard__step--visible', step === 'siblings');
    this.tabStudent!.classList.toggle('wizard__tab--active', step === 'student');
    this.tabSiblings!.classList.toggle('wizard__tab--active', step === 'siblings');
    this.tabStudent!.setAttribute('aria-selected', String(step === 'student'));
    this.tabSiblings!.setAttribute('aria-selected', String(step === 'siblings'));

    if (step === 'siblings' && this._mode === 'edit' && this._studentId) {
      this.siblingsStep!.activate(this._studentId);
      this.dispatchEvent(
        new CustomEvent('siblings-tab-activated', {
          bubbles: true,
          composed: true,
          detail: { studentId: this._studentId },
        }),
      );
    }

    this.updateFooter();
  }

  private updateFooter(): void {
    const isCreate = this._mode === 'create';

    this.tabSiblings!.disabled = isCreate;

    this.previousBtn!.hidden = !(isCreate && this._activeStep === 'siblings');
    this.nextBtn!.hidden = !(isCreate && this._activeStep === 'student');
    this.saveBtn!.hidden = isCreate && this._activeStep !== 'siblings';
  }

  private handleNext(): void {
    if (!this.studentStep!.reportValidity()) return;
    this.goToStep('siblings');
  }

  private handleSave(): void {
    if (!this.studentStep!.reportValidity()) {
      this.goToStep('student');
      return;
    }

    const input = this.studentStep!.getValues();
    this.saveBtn!.disabled = true;

    if (this._mode === 'create') {
      this.dispatchEvent(
        new CustomEvent('student-create-requested', {
          bubbles: true,
          composed: true,
          detail: { input, pendingSiblingIds: this.siblingsStep!.pendingSiblingIds },
        }),
      );
    } else {
      this.dispatchEvent(
        new CustomEvent('student-update-requested', {
          bubbles: true,
          composed: true,
          detail: { studentId: this._studentId, input },
        }),
      );
    }
  }
}

customElements.define('pm-student-wizard-modal', PmStudentWizardModal);
