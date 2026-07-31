import '../components/pm-relationship-form';
import '../components/pm-relationship-list';
import '../components/pm-delete-relationship-modal';
import {
  getGuardianRelationships,
  createGuardianRelationship,
  renameGuardianRelationship,
  deleteGuardianRelationship,
  countGuardianRelationship,
  clearGuardianRelationshipsCache,
  GuardiansError,
  type GuardianRelationship,
} from '../services/guardians';
import type { PmRelationshipForm } from '../components/pm-relationship-form';
import type { PmRelationshipList } from '../components/pm-relationship-list';
import type { PmDeleteRelationshipModal } from '../components/pm-delete-relationship-modal';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      flex: 1;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .guardian-relationships__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .guardian-relationships__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin: 0;
    }
    .guardian-relationships__create-btn {
      height: 40px;
      padding: 0 20px;
      border: none;
      border-radius: var(--pm-radius);
      background: var(--pm-accent);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
    }
    .guardian-relationships__error {
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
      display: none;
    }
    .guardian-relationships__error--visible {
      display: block;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="guardian-relationships__header">
    <h1 class="guardian-relationships__title">Guardian Relationships</h1>
    <button type="button" class="guardian-relationships__create-btn" id="createBtn">Create Relationship</button>
  </div>
  <div class="guardian-relationships__error" id="error"></div>
  <pm-relationship-form id="form" hidden></pm-relationship-form>
  <pm-relationship-list id="list"></pm-relationship-list>
  <pm-delete-relationship-modal id="deleteModal"></pm-delete-relationship-modal>
`;

export class PmGuardianRelationshipsPage extends HTMLElement {
  private createBtn: HTMLButtonElement | null = null;
  private relationshipForm: PmRelationshipForm | null = null;
  private relationshipList: PmRelationshipList | null = null;
  private deleteModal: PmDeleteRelationshipModal | null = null;
  private errorBanner: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.createBtn = this.shadowRoot!.getElementById('createBtn') as HTMLButtonElement;
    this.relationshipForm = this.shadowRoot!.getElementById('form') as unknown as PmRelationshipForm;
    this.relationshipList = this.shadowRoot!.getElementById('list') as unknown as PmRelationshipList;
    this.deleteModal = this.shadowRoot!.getElementById('deleteModal') as unknown as PmDeleteRelationshipModal;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;

    this.createBtn.addEventListener('click', this.handleCreateClicked);
    this.shadowRoot!.addEventListener('relationship-form-submitted', this.handleFormSubmitted);
    this.shadowRoot!.addEventListener('relationship-form-cancelled', this.handleFormCancelled);
    this.shadowRoot!.addEventListener('relationship-edit-saved', this.handleEditSaved);
    this.shadowRoot!.addEventListener('relationship-delete-clicked', this.handleDeleteClicked);
    this.shadowRoot!.addEventListener('relationship-delete-confirmed', this.handleDeleteConfirmed);

    // The lookup is cached for the guardian dropdown, so drop it on entry to
    // make sure this screen opens on what the server currently holds.
    clearGuardianRelationshipsCache();
    void this.loadRelationships();
  }

  disconnectedCallback(): void {
    this.createBtn?.removeEventListener('click', this.handleCreateClicked);
    this.shadowRoot!.removeEventListener('relationship-form-submitted', this.handleFormSubmitted);
    this.shadowRoot!.removeEventListener('relationship-form-cancelled', this.handleFormCancelled);
    this.shadowRoot!.removeEventListener('relationship-edit-saved', this.handleEditSaved);
    this.shadowRoot!.removeEventListener('relationship-delete-clicked', this.handleDeleteClicked);
    this.shadowRoot!.removeEventListener('relationship-delete-confirmed', this.handleDeleteConfirmed);
  }

  private handleCreateClicked = (): void => {
    this.clearError();
    this.relationshipForm!.reset();
    this.relationshipForm!.hidden = false;
  };

  private handleFormCancelled = (): void => {
    this.relationshipForm!.hidden = true;
  };

  private handleFormSubmitted = async (event: Event): Promise<void> => {
    const { name } = (event as CustomEvent<{ name: string }>).detail;
    this.clearError();

    try {
      await createGuardianRelationship(name);
      this.relationshipForm!.hidden = true;
      await this.loadRelationships();
    } catch (err) {
      this.showError(err);
    }
  };

  private handleEditSaved = async (event: Event): Promise<void> => {
    const { guardianRelationshipId, name } = (event as CustomEvent<{ guardianRelationshipId: string; name: string }>)
      .detail;
    this.clearError();

    try {
      await renameGuardianRelationship(guardianRelationshipId, name);
      await this.loadRelationships();
    } catch (err) {
      this.showError(err);
    }
  };

  /**
   * A type that is already assigned to a guardian cannot be deleted, so the
   * confirmation is never opened for one — the user is told why instead of
   * being asked to confirm something the server would reject.
   */
  private handleDeleteClicked = async (event: Event): Promise<void> => {
    const { relationship } = (event as CustomEvent<{ relationship: GuardianRelationship }>).detail;
    this.clearError();

    try {
      var countResult = await countGuardianRelationship(relationship.guardianRelationshipId);
      if (countResult.count > 0) {
        this.showErrorMessage(
          `Guardian relationship ${relationship.name} is assigned to ${countResult.count} guardian(s) and cannot be deleted.`,
        );
        return;
      }
      this.deleteModal!.show(relationship.guardianRelationshipId, relationship.name);
    } catch (err) {
      this.showError(err);
    }
  };

  private handleDeleteConfirmed = async (event: Event): Promise<void> => {
    const { guardianRelationshipId } = (event as CustomEvent<{ guardianRelationshipId: string }>).detail;
    this.clearError();

    try {
      await deleteGuardianRelationship(guardianRelationshipId);
      await this.loadRelationships();
    } catch (err) {
      this.showError(err);
    }
  };

  private loadRelationships = async (): Promise<void> => {
    try {
      this.relationshipList!.relationships = await getGuardianRelationships();
    } catch (err) {
      this.showError(err);
    }
  };

  private showError(err: unknown): void {
    this.showErrorMessage(err instanceof GuardiansError ? err.message : 'An unexpected error occurred');
  }

  private showErrorMessage(message: string): void {
    this.errorBanner!.textContent = message;
    this.errorBanner!.classList.add('guardian-relationships__error--visible');
  }

  private clearError(): void {
    this.errorBanner!.textContent = '';
    this.errorBanner!.classList.remove('guardian-relationships__error--visible');
  }
}

customElements.define('pm-guardian-relationships-page', PmGuardianRelationshipsPage);
