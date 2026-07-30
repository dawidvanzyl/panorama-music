import './pm-student-step';
import './pm-siblings-step';
import './pm-guardians-step';
import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import type { StudentResult } from '../services/students';
import type { GuardianRelationship, GuardianResult } from '../services/guardians';
import type { PmStudentStep } from './pm-student-step';
import type { PmSiblingsStep } from './pm-siblings-step';
import type { PmGuardiansStep } from './pm-guardians-step';

type Mode = 'create' | 'edit';
type Step = 'student' | 'siblings' | 'guardians';

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
    .wizard__step-actions {
      flex: 0 0 auto;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
    .wizard__step-actions[hidden] {
      display: none;
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
        <button type="button" class="wizard__tab" id="tabGuardians" role="tab" aria-selected="false" aria-controls="stepGuardians">Guardians</button>
      </div>
      <div class="wizard__step wizard__step--visible" id="stepStudent" role="tabpanel" aria-labelledby="tabStudent">
        <pm-student-step id="studentStep"></pm-student-step>
        <div class="wizard__step-actions" id="studentStepActions" hidden>
          <button type="button" class="wizard__btn wizard__btn--cancel" id="studentCancelBtn">Cancel</button>
          <button type="button" class="wizard__btn wizard__btn--primary" id="studentSaveBtn">Save</button>
        </div>
      </div>
      <div class="wizard__step" id="stepSiblings" role="tabpanel" aria-labelledby="tabSiblings">
        <pm-siblings-step id="siblingsStep"></pm-siblings-step>
      </div>
      <div class="wizard__step" id="stepGuardians" role="tabpanel" aria-labelledby="tabGuardians">
        <pm-guardians-step id="guardiansStep"></pm-guardians-step>
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
  private tabGuardians: HTMLButtonElement | null = null;
  private stepStudentEl: HTMLElement | null = null;
  private stepSiblingsEl: HTMLElement | null = null;
  private stepGuardiansEl: HTMLElement | null = null;
  private studentStep: PmStudentStep | null = null;
  private siblingsStep: PmSiblingsStep | null = null;
  private guardiansStep: PmGuardiansStep | null = null;
  private cancelBtn: HTMLButtonElement | null = null;
  private previousBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;
  private studentStepActions: HTMLElement | null = null;
  private studentCancelBtn: HTMLButtonElement | null = null;
  private studentSaveBtn: HTMLButtonElement | null = null;

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
    this.tabGuardians = this.shadowRoot!.getElementById('tabGuardians') as HTMLButtonElement;
    this.stepStudentEl = this.shadowRoot!.getElementById('stepStudent') as HTMLElement;
    this.stepSiblingsEl = this.shadowRoot!.getElementById('stepSiblings') as HTMLElement;
    this.stepGuardiansEl = this.shadowRoot!.getElementById('stepGuardians') as HTMLElement;
    this.studentStep = this.shadowRoot!.getElementById('studentStep') as unknown as PmStudentStep;
    this.siblingsStep = this.shadowRoot!.getElementById('siblingsStep') as unknown as PmSiblingsStep;
    this.guardiansStep = this.shadowRoot!.getElementById('guardiansStep') as unknown as PmGuardiansStep;
    this.cancelBtn = this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement;
    this.previousBtn = this.shadowRoot!.getElementById('previousBtn') as HTMLButtonElement;
    this.nextBtn = this.shadowRoot!.getElementById('nextBtn') as HTMLButtonElement;
    this.saveBtn = this.shadowRoot!.getElementById('saveBtn') as HTMLButtonElement;
    this.studentStepActions = this.shadowRoot!.getElementById('studentStepActions') as HTMLElement;
    this.studentCancelBtn = this.shadowRoot!.getElementById('studentCancelBtn') as HTMLButtonElement;
    this.studentSaveBtn = this.shadowRoot!.getElementById('studentSaveBtn') as HTMLButtonElement;

    this.tabStudent.addEventListener('click', () => this.goToStep('student'));
    this.tabSiblings.addEventListener('click', () => this.handleSiblingsTabClick());
    this.tabGuardians.addEventListener('click', () => this.handleGuardiansTabClick());
    this.cancelBtn.addEventListener('click', () => this.close());
    this.previousBtn.addEventListener('click', () => this.handlePrevious());
    this.nextBtn.addEventListener('click', () => this.handleNext());
    this.saveBtn.addEventListener('click', () => this.handleSave());
    this.studentCancelBtn.addEventListener('click', () => this.close());
    this.studentSaveBtn.addEventListener('click', () => this.handleSave());
  }

  openForCreate(candidates: StudentResult[]): void {
    this._mode = 'create';
    this._studentId = null;
    this.titleEl!.textContent = 'Create Student';
    this.studentStep!.reset();
    this.siblingsStep!.activateForCreate(candidates);
    this.guardiansStep!.activateForCreate();
    this.saveBtn!.disabled = false;
    this.studentSaveBtn!.disabled = false;
    this.goToStep('student');
    this.setAttribute('open', '');
  }

  openForEdit(student: StudentResult): void {
    this._mode = 'edit';
    this._studentId = student.studentId;
    this.titleEl!.textContent = `Edit Student: ${student.firstName} ${student.lastName}`;
    this.studentStep!.setValues(student);
    this.saveBtn!.disabled = false;
    this.studentSaveBtn!.disabled = false;
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
    this.studentSaveBtn!.disabled = false;
  }

  showSiblingsError(message: string): void {
    this.siblingsStep!.showError(message);
  }

  showGuardiansError(message: string): void {
    this.guardiansStep!.showError(message);
  }

  /** Collapses the Guardians step's Add/Edit form panel (if open) and returns to the list view. */
  closeGuardianForm(): void {
    this.guardiansStep!.closeForm();
  }

  set siblings(value: StudentResult[]) {
    this.siblingsStep!.siblings = value;
  }

  set candidates(value: StudentResult[]) {
    this.siblingsStep!.candidates = value;
  }

  set guardians(value: GuardianResult[]) {
    this.guardiansStep!.guardians = value;
  }

  set guardianRelationships(value: GuardianRelationship[]) {
    this.guardiansStep!.relationships = value;
  }

  set hasMissingSiblingGuardians(value: boolean) {
    this.guardiansStep!.hasMissingSiblingGuardians = value;
  }

  /** Read-only preview of the currently-staged siblings' guardians (create mode only). */
  setInheritedGuardiansForCreate(guardians: GuardianResult[]): void {
    this.guardiansStep!.setInheritedGuardians(guardians);
  }

  /** Guardians staged during create mode, to be created and linked once the student is saved. */
  get pendingGuardians() {
    return this.guardiansStep!.pendingGuardians;
  }

  private handleSiblingsTabClick(): void {
    if (this._mode === 'create') return;
    this.goToStep('siblings');
  }

  private handleGuardiansTabClick(): void {
    if (this._mode === 'create') return;
    this.goToStep('guardians');
  }

  private goToStep(step: Step): void {
    this._activeStep = step;

    this.stepStudentEl!.classList.toggle('wizard__step--visible', step === 'student');
    this.stepSiblingsEl!.classList.toggle('wizard__step--visible', step === 'siblings');
    this.stepGuardiansEl!.classList.toggle('wizard__step--visible', step === 'guardians');
    this.tabStudent!.classList.toggle('wizard__tab--active', step === 'student');
    this.tabSiblings!.classList.toggle('wizard__tab--active', step === 'siblings');
    this.tabGuardians!.classList.toggle('wizard__tab--active', step === 'guardians');
    this.tabStudent!.setAttribute('aria-selected', String(step === 'student'));
    this.tabSiblings!.setAttribute('aria-selected', String(step === 'siblings'));
    this.tabGuardians!.setAttribute('aria-selected', String(step === 'guardians'));

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

    if (step === 'guardians' && this._mode === 'edit' && this._studentId) {
      this.guardiansStep!.activate(this._studentId);
      this.dispatchEvent(
        new CustomEvent('guardians-tab-activated', {
          bubbles: true,
          composed: true,
          detail: { studentId: this._studentId },
        }),
      );
    }

    this.updateFooter();
  }

  /**
   * In edit mode, Siblings and Guardians persist their own changes immediately —
   * the shared Cancel/Save pair only ever acted on the Student tab's fields, which
   * misleadingly implied it covered the other tabs too. So in edit mode, Student's
   * own Cancel/Save live next to its fields instead of the shared footer, and the
   * footer falls back to a plain Close (nothing left for it to cancel) on the other tabs.
   */
  private updateFooter(): void {
    const isCreate = this._mode === 'create';
    const onStudentTab = this._activeStep === 'student';

    this.tabSiblings!.disabled = isCreate;
    this.tabGuardians!.disabled = isCreate;

    this.previousBtn!.hidden = !(isCreate && this._activeStep !== 'student');
    this.nextBtn!.hidden = !(isCreate && this._activeStep !== 'guardians');
    this.saveBtn!.hidden = isCreate ? this._activeStep !== 'guardians' : true;
    this.cancelBtn!.hidden = !isCreate && onStudentTab;
    this.cancelBtn!.textContent = isCreate ? 'Cancel' : 'Close';
    this.studentStepActions!.hidden = isCreate || !onStudentTab;
  }

  private handlePrevious(): void {
    if (this._activeStep === 'guardians') {
      this.goToStep('siblings');
      return;
    }
    if (this._activeStep === 'siblings') {
      this.goToStep('student');
    }
  }

  private handleNext(): void {
    if (this._activeStep === 'student') {
      if (!this.studentStep!.reportValidity()) return;
      this.goToStep('siblings');
      return;
    }
    if (this._activeStep === 'siblings') {
      this.dispatchEvent(
        new CustomEvent('create-guardians-preview-requested', {
          bubbles: true,
          composed: true,
          detail: { siblingIds: this.siblingsStep!.pendingSiblingIds },
        }),
      );
      this.goToStep('guardians');
    }
  }

  private handleSave(): void {
    if (!this.studentStep!.reportValidity()) {
      this.goToStep('student');
      return;
    }

    const input = this.studentStep!.getValues();
    this.saveBtn!.disabled = true;
    this.studentSaveBtn!.disabled = true;

    if (this._mode === 'create') {
      this.dispatchEvent(
        new CustomEvent('student-create-requested', {
          bubbles: true,
          composed: true,
          detail: {
            input,
            pendingSiblingIds: this.siblingsStep!.pendingSiblingIds,
            pendingGuardians: this.guardiansStep!.pendingGuardians,
          },
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
