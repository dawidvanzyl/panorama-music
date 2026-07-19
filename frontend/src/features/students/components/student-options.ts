import type { Grade, StudentClass, Phase, StudentLanguage } from '../services/students';

export const GRADES: Grade[] = ['Grade1', 'Grade2', 'Grade3', 'Grade4', 'Grade5', 'Grade6', 'Grade7', 'Private'];
export const CLASSES: StudentClass[] = ['A1', 'A2', 'E1', 'E2', 'E3', 'E4'];
export const PHASES: Phase[] = ['Junior', 'Senior'];
export const LANGUAGES: StudentLanguage[] = ['Afrikaans', 'English'];

export function populateSelectOptions(select: HTMLSelectElement, values: string[]): void {
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}
