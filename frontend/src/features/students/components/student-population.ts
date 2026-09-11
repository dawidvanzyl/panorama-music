import type { StudentPopulation } from '../services/students';

/**
 * How a student's listing is shown wherever both populations sit in one list.
 *
 * Both states are marked. An absent icon must never be how a reader infers
 * "enrolled": absence is indistinguishable from a row that failed to render,
 * and the two kinds of sibling differ in consequence.
 */
interface PopulationDisplay {
  icon: string;
  description: string;
}

const POPULATION_DISPLAY: Record<StudentPopulation, PopulationDisplay> = {
  Enrolled: { icon: 'how_to_reg', description: 'This student is enrolled.' },
  WaitingList: { icon: 'pending_actions', description: 'This student is on the waiting list.' },
};

/**
 * The icon stating which listing a student belongs to, with its meaning on the
 * icon itself — surfacing on hover and to assistive technology — rather than as
 * text crowding the row, following the restricted-guardian affordance.
 */
export function buildPopulationIcon(population: StudentPopulation): HTMLElement {
  const { icon, description } = POPULATION_DISPLAY[population];

  const element = document.createElement('span');
  element.classList.add('pm-population-icon');
  // The glyph name is the icon's own text and would otherwise be announced in
  // place of its meaning, so the element names itself.
  element.setAttribute('role', 'img');
  element.textContent = icon;
  element.title = description;
  element.setAttribute('aria-label', description);

  return element;
}

export function populationDescription(population: StudentPopulation): string {
  return POPULATION_DISPLAY[population].description;
}
