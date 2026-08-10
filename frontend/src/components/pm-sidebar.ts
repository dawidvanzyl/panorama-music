import { isAuthenticated } from '../services/auth';
import { hasRole, hasAnyRole } from '../services/token-storage';
import { updateActiveNavSection } from '../services/nav-section';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
      width: var(--pm-sidebar-width, 240px);
      flex-shrink: 0;
      height: 100%;
      background: var(--pm-surface);
      border-right: 1px solid var(--pm-border);
    }
    [hidden] {
      display: none !important;
    }
    nav {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px;
      height: 100%;
    }
    .sidebar__links {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .sidebar__link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--pm-radius);
      color: var(--pm-text-muted);
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
    }
    .sidebar__link:hover,
    .sidebar__link--active {
      background: var(--pm-surface-2);
      color: var(--pm-text);
    }
    .sidebar__icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 20px;
      flex-shrink: 0;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <nav>
    <div class="sidebar__links">
      <a href="#/students" class="sidebar__link" id="studentManagementLink" hidden>
        <span class="sidebar__icon">group</span>
        <span>Student Management</span>
      </a>
      <a href="#/teachers" class="sidebar__link" id="teachersLink" hidden>
        <span class="sidebar__icon">school</span>
        <span>Teacher Management</span>
      </a>
      <a href="#/students/guardian-relationships" class="sidebar__link" id="guardianRelationshipsLink" hidden>
        <span class="sidebar__icon">family_restroom</span>
        <span>Guardian Relationships</span>
      </a>      
      <a href="#/admin/users" class="sidebar__link" id="userManagementLink" hidden>
        <span class="sidebar__icon">group</span>
        <span>User Management</span>
      </a>
      <a href="#/admin/sessions" class="sidebar__link" id="adminSessionsLink" hidden>
        <span class="sidebar__icon">history</span>
        <span>User Sessions</span>
      </a>
      <a href="#/admin/activity-log" class="sidebar__link" id="activityLogLink" hidden>
        <span class="sidebar__icon">receipt_long</span>
        <span>Activity Log</span>
      </a>
    </div>
  </nav>
`;

export class PmSidebar extends HTMLElement {
  private studentManagementLink: HTMLAnchorElement | null = null;
  private guardianRelationshipsLink: HTMLAnchorElement | null = null;
  private teachersLink: HTMLAnchorElement | null = null;
  private userManagementLink: HTMLAnchorElement | null = null;
  private adminSessionsLink: HTMLAnchorElement | null = null;
  private activityLogLink: HTMLAnchorElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.studentManagementLink = this.shadowRoot!.getElementById('studentManagementLink') as HTMLAnchorElement;
    this.guardianRelationshipsLink = this.shadowRoot!.getElementById('guardianRelationshipsLink') as HTMLAnchorElement;
    this.teachersLink = this.shadowRoot!.getElementById('teachersLink') as HTMLAnchorElement;
    this.userManagementLink = this.shadowRoot!.getElementById('userManagementLink') as HTMLAnchorElement;
    this.adminSessionsLink = this.shadowRoot!.getElementById('adminSessionsLink') as HTMLAnchorElement;
    this.activityLogLink = this.shadowRoot!.getElementById('activityLogLink') as HTMLAnchorElement;

    this.updateVisibility();
    window.addEventListener('hashchange', this.updateVisibility);
  }

  disconnectedCallback(): void {
    window.removeEventListener('hashchange', this.updateVisibility);
  }

  private updateVisibility = (): void => {
    const basePath = window.location.hash.slice(1).split('?')[0];
    const activeSection = updateActiveNavSection(basePath);

    const showAdminLinks = isAuthenticated() && hasRole('Admin') && activeSection === 'admin';
    const showStudentLinks = isAuthenticated() && hasAnyRole(['Teacher', 'Admin']) && activeSection === 'students';
    const showRelationshipLinks =
      isAuthenticated() && hasAnyRole(['Coordinator', 'Admin']) && activeSection === 'students';
    const showTeachersLink = isAuthenticated() && hasAnyRole(['Coordinator', 'Admin']) && activeSection === 'students';
    this.studentManagementLink!.hidden = !showStudentLinks;
    this.guardianRelationshipsLink!.hidden = !showRelationshipLinks;
    this.teachersLink!.hidden = !showTeachersLink;
    this.userManagementLink!.hidden = !showAdminLinks;
    this.adminSessionsLink!.hidden = !showAdminLinks;
    this.activityLogLink!.hidden = !showAdminLinks;

    this.studentManagementLink!.classList.toggle('sidebar__link--active', basePath === '/students');
    this.guardianRelationshipsLink!.classList.toggle(
      'sidebar__link--active',
      basePath === '/students/guardian-relationships',
    );
    this.teachersLink!.classList.toggle('sidebar__link--active', basePath.startsWith('/teachers'));
    this.userManagementLink!.classList.toggle('sidebar__link--active', basePath === '/admin/users');
    this.adminSessionsLink!.classList.toggle('sidebar__link--active', basePath === '/admin/sessions');
    this.activityLogLink!.classList.toggle('sidebar__link--active', basePath === '/admin/activity-log');
  };
}

customElements.define('pm-sidebar', PmSidebar);
