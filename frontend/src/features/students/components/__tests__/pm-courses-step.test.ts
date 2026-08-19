import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmCoursesStep, AT_LEAST_ONE_COURSE, AT_LEAST_ONE_COURSE_TO_WITHDRAW } from '../pm-courses-step';
import type { AssignableTeacher, EnrollableCourse, EnrollmentResult } from '../../services/enrollments';

const instrumentCourse: EnrollableCourse = {
  courseId: 'c-instrument',
  courseType: 'Instrument',
  lessonType: 'Individual',
  durationType: 'HalfHour',
  occurrenceType: 'DuringSchool',
};

const recorderCourse: EnrollableCourse = {
  courseId: 'c-recorder',
  courseType: 'G2Recorder',
  lessonType: 'Group',
  durationType: 'HalfHour',
  occurrenceType: 'DuringSchool',
};

const thabo: AssignableTeacher = { teacherId: 't1', firstName: 'Thabo', surname: 'Nkosi', isActive: true };
const lindiwe: AssignableTeacher = { teacherId: 't2', firstName: 'Lindiwe', surname: 'Mabaso', isActive: true };

const persistedEnrollment: EnrollmentResult = {
  studentCourseId: 'sc1',
  studentId: 's1',
  courseId: 'c-instrument',
  courseType: 'Instrument',
  lessonType: 'Individual',
  durationType: 'HalfHour',
  occurrenceType: 'DuringSchool',
  teacherId: 't1',
  teacherFirstName: 'Thabo',
  teacherSurname: 'Nkosi',
  instrumentType: 'Piano',
  stepType: 'Step2A',
  enrolledDate: '2026-01-19',
};

let step: PmCoursesStep;

function stepShadow(): ShadowRoot {
  return step.shadowRoot!;
}

function listShadow(): ShadowRoot {
  return stepShadow().getElementById('enrollmentList')!.shadowRoot!;
}

function formShadow(): ShadowRoot {
  return stepShadow().getElementById('enrollmentForm')!.shadowRoot!;
}

function rows(): HTMLTableRowElement[] {
  return [...listShadow().querySelectorAll('tbody tr')] as HTMLTableRowElement[];
}

function cellsOf(row: HTMLTableRowElement): string[] {
  return [...row.querySelectorAll('td')].map((cell) => cell.textContent!);
}

/** Opens the enroll panel, fills it in, and confirms — the staging path in create mode. */
function stageEnrollment(courseId: string, teacherId: string, instrument?: string, stepType?: string): void {
  (stepShadow().getElementById('enrollBtn') as HTMLButtonElement).click();
  const courseSelect = formShadow().getElementById('course') as HTMLSelectElement;
  courseSelect.value = courseId;
  courseSelect.dispatchEvent(new Event('change'));
  (formShadow().getElementById('teacher') as HTMLSelectElement).value = teacherId;
  if (instrument) (formShadow().getElementById('instrument') as HTMLSelectElement).value = instrument;
  if (stepType) (formShadow().getElementById('step') as HTMLSelectElement).value = stepType;
  (formShadow().getElementById('confirmBtn') as HTMLButtonElement).click();
}

const recorderEnrollment: EnrollmentResult = {
  ...persistedEnrollment,
  studentCourseId: 'sc2',
  courseId: 'c-recorder',
  courseType: 'G2Recorder',
  lessonType: 'Group',
  instrumentType: null,
  stepType: null,
  enrolledDate: '2026-02-10',
};

/** Puts the step in edit mode holding the given persisted enrollments. */
function activateWith(...enrollments: EnrollmentResult[]): void {
  step.activate('s1');
  step.enrollments = enrollments;
}

function selectsOf(row: HTMLTableRowElement): HTMLSelectElement[] {
  return [...row.querySelectorAll('select')];
}

beforeEach(() => {
  step = new PmCoursesStep();
  document.body.appendChild(step);
  step.courses = [instrumentCourse, recorderCourse];
  step.teachers = [thabo, lindiwe];
});

afterEach(() => {
  document.body.removeChild(step);
});

describe('pm-courses-step edits a persisted enrollment in place', { tags: ['269UC11'] }, () => {
  it('makes teacher, instrument and step editable while the course and enrolled date stay fixed', () => {
    activateWith(persistedEnrollment, recorderEnrollment);

    (rows()[0].querySelector('.enrollment-list__btn--change') as HTMLButtonElement).click();

    const editRow = rows()[0];
    const [teacherSelect, instrumentSelect, stepSelect] = selectsOf(editRow);

    // Three selects, not four — the course is settled at enrollment, so it has
    // none and stays the text it already read as.
    expect(selectsOf(editRow)).toHaveLength(3);
    expect(teacherSelect.value).toBe(thabo.teacherId);
    expect(instrumentSelect.value).toBe('Piano');
    expect(instrumentSelect.hidden).toBe(false);
    expect(stepSelect.value).toBe('Step2A');
    expect(cellsOf(editRow)[0]).toBe('Instrument · Individual · Half Hour · During School');
    expect(cellsOf(editRow)[4]).toBe('2026-01-19');
    expect(editRow.querySelector('.enrollment-list__btn--save')!.textContent).toBe('Save');
    expect(editRow.querySelector('.enrollment-list__btn--cancel')!.textContent).toBe('Cancel');
  });

  it('offers neither instrument nor step on a course type that records neither', () => {
    activateWith(persistedEnrollment, recorderEnrollment);

    (rows()[1].querySelector('.enrollment-list__btn--change') as HTMLButtonElement).click();

    const [, instrumentSelect, stepSelect] = selectsOf(rows()[1]);
    expect(instrumentSelect.hidden).toBe(true);
    expect(stepSelect.hidden).toBe(true);
  });
});

describe('pm-courses-step submits a persisted enrollment edit', { tags: ['269UC12'] }, () => {
  it('asks for the update with only what may change', () => {
    const requests: CustomEvent[] = [];
    step.addEventListener('enrollment-update-requested', (event) => requests.push(event as CustomEvent));

    activateWith(persistedEnrollment, recorderEnrollment);
    (rows()[0].querySelector('.enrollment-list__btn--change') as HTMLButtonElement).click();

    const editRow = rows()[0];
    const [teacherSelect, instrumentSelect, stepSelect] = selectsOf(editRow);
    teacherSelect.value = lindiwe.teacherId;
    instrumentSelect.value = 'Guitar';
    stepSelect.value = 'Step3B';
    (editRow.querySelector('.enrollment-list__btn--save') as HTMLButtonElement).click();

    expect(requests).toHaveLength(1);
    expect(requests[0].detail).toEqual({
      studentId: 's1',
      studentCourseId: 'sc1',
      input: { teacherId: lindiwe.teacherId, instrumentType: 'Guitar', stepType: 'Step3B' },
    });
  });
});

describe('pm-courses-step refuses an incomplete persisted enrollment edit', { tags: ['269UC13'] }, () => {
  it('reports the missing selection and submits nothing', () => {
    const requests: Event[] = [];
    step.addEventListener('enrollment-update-requested', (event) => requests.push(event));

    activateWith(persistedEnrollment, recorderEnrollment);
    (rows()[0].querySelector('.enrollment-list__btn--change') as HTMLButtonElement).click();

    const editRow = rows()[0];
    const [, instrumentSelect] = selectsOf(editRow);
    instrumentSelect.value = '';
    (editRow.querySelector('.enrollment-list__btn--save') as HTMLButtonElement).click();

    expect(requests).toHaveLength(0);
    expect(instrumentSelect.checkValidity()).toBe(false);
    // Still in edit mode, with the cleared selection there to be made.
    expect(selectsOf(rows()[0])).toHaveLength(3);
  });
});

describe('pm-courses-step cancels a persisted enrollment edit', { tags: ['269UC14'] }, () => {
  it('restores the row previous values and submits nothing', () => {
    const requests: Event[] = [];
    step.addEventListener('enrollment-update-requested', (event) => requests.push(event));

    activateWith(persistedEnrollment, recorderEnrollment);
    (rows()[0].querySelector('.enrollment-list__btn--change') as HTMLButtonElement).click();

    const editRow = rows()[0];
    const [teacherSelect] = selectsOf(editRow);
    teacherSelect.value = lindiwe.teacherId;
    (editRow.querySelector('.enrollment-list__btn--cancel') as HTMLButtonElement).click();

    expect(requests).toHaveLength(0);
    expect(selectsOf(rows()[0])).toHaveLength(0);
    expect(cellsOf(rows()[0]).slice(1, 4)).toEqual(['Thabo Nkosi', 'Piano', '2A']);
  });
});

describe('pm-courses-step edits one persisted row at a time', { tags: ['269UC15'] }, () => {
  it('closes the first row without submitting when a second is opened', () => {
    const requests: Event[] = [];
    step.addEventListener('enrollment-update-requested', (event) => requests.push(event));

    activateWith(persistedEnrollment, recorderEnrollment);
    (rows()[0].querySelector('.enrollment-list__btn--change') as HTMLButtonElement).click();
    selectsOf(rows()[0])[0].value = lindiwe.teacherId;

    (rows()[1].querySelector('.enrollment-list__btn--change') as HTMLButtonElement).click();

    expect(requests).toHaveLength(0);
    expect(selectsOf(rows()[0])).toHaveLength(0);
    expect(selectsOf(rows()[1])).toHaveLength(3);
    // The abandoned edit left nothing behind on the row it was made on.
    expect(cellsOf(rows()[0])[1]).toBe('Thabo Nkosi');
  });
});

describe('pm-courses-step asks to confirm a withdrawal', { tags: ['269UC16'] }, () => {
  it('names the enrollment being withdrawn and submits nothing yet', () => {
    const requests: CustomEvent[] = [];
    step.addEventListener('enrollment-withdraw-requested', (event) => requests.push(event as CustomEvent));

    activateWith(persistedEnrollment, recorderEnrollment);
    (rows()[0].querySelector('.enrollment-list__btn--remove') as HTMLButtonElement).click();

    expect(requests).toHaveLength(1);
    expect(requests[0].detail).toEqual({ studentId: 's1', enrollment: persistedEnrollment });
    expect(rows()).toHaveLength(2);
  });
});

describe('pm-courses-step refuses to withdraw the only enrollment', { tags: ['269UC19'] }, () => {
  it('offers no confirmation and states the requirement instead', () => {
    const requests: Event[] = [];
    step.addEventListener('enrollment-withdraw-requested', (event) => requests.push(event));

    activateWith(persistedEnrollment);
    (rows()[0].querySelector('.enrollment-list__btn--remove') as HTMLButtonElement).click();

    expect(requests).toHaveLength(0);
    expect(rows()).toHaveLength(1);
    expect((stepShadow().getElementById('message') as HTMLElement).textContent).toBe(AT_LEAST_ONE_COURSE_TO_WITHDRAW);
  });
});

describe('pm-courses-step lists the student existing enrollments', { tags: ['268UC14'] }, () => {
  it('shows course, teacher, instrument, step and enrolled date, with an em dash for what the course type omits', () => {
    step.activate('s1');
    step.enrollments = [
      persistedEnrollment,
      {
        ...persistedEnrollment,
        studentCourseId: 'sc2',
        courseType: 'G2Recorder',
        instrumentType: null,
        stepType: null,
      },
    ];

    expect(cellsOf(rows()[0]).slice(0, 5)).toEqual([
      'Instrument · Individual · Half Hour · During School',
      'Thabo Nkosi',
      'Piano',
      '2A',
      '2026-01-19',
    ]);
    expect(cellsOf(rows()[1]).slice(2, 4)).toEqual(['—', '—']);
  });
});

describe('pm-courses-step empty state', { tags: ['268UC15'] }, () => {
  it('shows the empty-state message in place of enrollment rows', () => {
    step.activate('s1');
    step.enrollments = [];

    const empty = listShadow().getElementById('empty') as HTMLElement;
    expect(empty.hidden).toBe(false);
    expect(empty.textContent).toBe('No course enrollments.');
    expect(rows()).toHaveLength(0);
  });
});

describe('pm-courses-step stages enrollments in create mode', { tags: ['268UC21'] }, () => {
  it('renders staged rows with Change and Remove and sends nothing', () => {
    const requests: Event[] = [];
    step.addEventListener('enrollment-add-requested', (event) => requests.push(event));

    step.activateForCreate();
    stageEnrollment(instrumentCourse.courseId, thabo.teacherId, 'Piano', 'Step2A');

    expect(requests).toHaveLength(0);
    expect(rows()).toHaveLength(1);
    expect(cellsOf(rows()[0]).slice(0, 4)).toEqual([
      'Instrument · Individual · Half Hour · During School',
      'Thabo Nkosi',
      'Piano',
      '2A',
    ]);
    expect(rows()[0].querySelector('.enrollment-list__btn--change')!.textContent).toBe('Change');
    expect(rows()[0].querySelector('.enrollment-list__btn--remove')!.textContent).toBe('Remove');
    expect(step.pendingEnrollments).toEqual([
      expect.objectContaining({ courseId: instrumentCourse.courseId, teacherId: thabo.teacherId }),
    ]);
  });
});

describe('pm-courses-step removes a staged enrollment', { tags: ['268UC24'] }, () => {
  it('drops the row from the staged list so it is not created on save', () => {
    step.activateForCreate();
    stageEnrollment(instrumentCourse.courseId, thabo.teacherId, 'Piano', 'Step2A');
    stageEnrollment(recorderCourse.courseId, lindiwe.teacherId);
    expect(rows()).toHaveLength(2);

    (rows()[0].querySelector('.enrollment-list__btn--remove') as HTMLButtonElement).click();

    expect(rows()).toHaveLength(1);
    expect(step.pendingEnrollments).toEqual([expect.objectContaining({ courseId: recorderCourse.courseId })]);
  });
});

describe('pm-courses-step refuses to remove the only staged enrollment', { tags: ['268UC28'] }, () => {
  it('keeps the row staged and states the requirement', () => {
    step.activateForCreate();
    stageEnrollment(instrumentCourse.courseId, thabo.teacherId, 'Piano', 'Step2A');

    (rows()[0].querySelector('.enrollment-list__btn--remove') as HTMLButtonElement).click();

    expect(rows()).toHaveLength(1);
    expect(step.pendingEnrollments).toHaveLength(1);
    expect((stepShadow().getElementById('message') as HTMLElement).textContent).toBe(AT_LEAST_ONE_COURSE);
  });
});

describe('pm-courses-step changes a staged enrollment', { tags: ['268UC25'] }, () => {
  it('reflects the new values under the same course-type rules and sends nothing', () => {
    const requests: Event[] = [];
    step.addEventListener('enrollment-add-requested', (event) => requests.push(event));

    step.activateForCreate();
    stageEnrollment(instrumentCourse.courseId, thabo.teacherId, 'Piano', 'Step2A');

    (rows()[0].querySelector('.enrollment-list__btn--change') as HTMLButtonElement).click();

    const editRow = rows()[0];
    const [courseSelect, teacherSelect, instrumentSelect, stepSelect] = editRow.querySelectorAll(
      'select',
    ) as NodeListOf<HTMLSelectElement>;
    expect(courseSelect.value).toBe(instrumentCourse.courseId);
    expect(instrumentSelect.hidden).toBe(false);

    teacherSelect.value = lindiwe.teacherId;
    instrumentSelect.value = 'Guitar';
    stepSelect.value = 'Step3B';
    (editRow.querySelector('.enrollment-list__btn--save') as HTMLButtonElement).click();

    expect(requests).toHaveLength(0);
    expect(cellsOf(rows()[0]).slice(1, 4)).toEqual(['Lindiwe Mabaso', 'Guitar', '3B']);
    expect(step.pendingEnrollments).toEqual([
      expect.objectContaining({ teacherId: lindiwe.teacherId, instrumentType: 'Guitar', stepType: 'Step3B' }),
    ]);
  });

  it('drops the instrument and step when the row is changed to a course type that records neither', () => {
    step.activateForCreate();
    stageEnrollment(instrumentCourse.courseId, thabo.teacherId, 'Piano', 'Step2A');

    (rows()[0].querySelector('.enrollment-list__btn--change') as HTMLButtonElement).click();

    const editRow = rows()[0];
    const [courseSelect] = editRow.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    courseSelect.value = recorderCourse.courseId;
    courseSelect.dispatchEvent(new Event('change'));
    (editRow.querySelector('.enrollment-list__btn--save') as HTMLButtonElement).click();

    expect(cellsOf(rows()[0]).slice(2, 4)).toEqual(['—', '—']);
    expect(step.pendingEnrollments).toEqual([
      expect.objectContaining({ courseId: recorderCourse.courseId, instrumentType: null, stepType: null }),
    ]);
  });
});

