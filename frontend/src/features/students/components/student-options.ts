import type { Grade, StudentClass, Phase, StudentLanguage } from '../services/students';

export const GRADES: Grade[] = ['Grade1', 'Grade2', 'Grade3', 'Grade4', 'Grade5', 'Grade6', 'Grade7', 'Private'];
export const CLASSES: StudentClass[] = ['A1', 'A2', 'E1', 'E2', 'E3', 'E4'];
export const PHASES: Phase[] = ['Junior', 'Senior'];
export const LANGUAGES: StudentLanguage[] = ['Afrikaans', 'English'];

const GRADE_LABELS: Record<Grade, string> = {
  Grade1: 'Grade 1',
  Grade2: 'Grade 2',
  Grade3: 'Grade 3',
  Grade4: 'Grade 4',
  Grade5: 'Grade 5',
  Grade6: 'Grade 6',
  Grade7: 'Grade 7',
  Private: 'Private',
};

export function gradeLabel(value: Grade): string {
  return GRADE_LABELS[value];
}

const GRADE_NUMBERS: Record<Grade, string> = {
  Grade1: '1',
  Grade2: '2',
  Grade3: '3',
  Grade4: '4',
  Grade5: '5',
  Grade6: '6',
  Grade7: '7',
  Private: '',
};

/** Bare grade digit for compact displays (e.g. "4A2"); Private has no digit. */
export function gradeNumber(value: Grade): string {
  return GRADE_NUMBERS[value];
}

export function populateSelectOptions<T extends string>(
  select: HTMLSelectElement,
  values: T[],
  labelFor: (value: T) => string = (value) => value,
): void {
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = labelFor(value);
    select.appendChild(option);
  }
}

export function addPlaceholderOption(select: HTMLSelectElement, label: string): void {
  if (select.options[0]?.value === '') return;
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = label;
  select.insertBefore(placeholder, select.firstChild);
}

export function removePlaceholderOption(select: HTMLSelectElement): void {
  if (select.options[0]?.value === '') select.remove(0);
}
