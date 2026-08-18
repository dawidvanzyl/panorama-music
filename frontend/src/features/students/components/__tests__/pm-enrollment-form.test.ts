import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PmEnrollmentForm } from '../pm-enrollment-form';
import { todayIsoDate } from '../enrollment-options';
import type { AssignableTeacher, EnrollableCourse } from '../../services/enrollments';

const instrumentCourse: EnrollableCourse = {
  courseId: 'c-instrument',
  courseType: 'Instrument',
  lessonType: 'Individual',
  durationType: 'HalfHour',
  occurrenceType: 'DuringSchool',
};

const theoryCourse: EnrollableCourse = {
  courseId: 'c-theory',
  courseType: 'Theory',
  lessonType: 'Group',
  durationType: 'Hour',
  occurrenceType: 'AfterSchool',
};

const recorderCourse: EnrollableCourse = {
  courseId: 'c-recorder',
  courseType: 'G2Recorder',
  lessonType: 'Group',
  durationType: 'HalfHour',
  occurrenceType: 'DuringSchool',
};

const teacher: AssignableTeacher = {
  teacherId: 't1',
  firstName: 'Thabo',
  surname: 'Nkosi',
  isActive: true,
};

let form: PmEnrollmentForm;

function field(id: string): HTMLElement {
  return form.shadowRoot!.getElementById(id) as HTMLElement;
}

function select(id: string): HTMLSelectElement {
  return form.shadowRoot!.getElementById(id) as HTMLSelectElement;
}

function chooseCourse(courseId: string): void {
  select('course').value = courseId;
  select('course').dispatchEvent(new Event('change'));
}

beforeEach(() => {
  form = new PmEnrollmentForm();
  document.body.appendChild(form);
  form.courses = [instrumentCourse, theoryCourse, recorderCourse];
  form.teachers = [teacher];
  // jsdom's reportValidity() is a stub that returns true regardless, so the
  // form's own validity is what the missing-selection test asserts on.
  form.shadowRoot!.querySelector('form')!.reportValidity = () =>
    form.shadowRoot!.querySelector('form')!.checkValidity();
});

afterEach(() => {
  document.body.removeChild(form);
});

describe('pm-enrollment-form fields offered on open', { tags: ['268UC16'] }, () => {
  it('offers course, teacher, instrument type, step and an enrolled date defaulted to today', () => {
    form.resetForAdd();

    expect(select('course')).not.toBeNull();
    expect(select('teacher')).not.toBeNull();
    expect(select('instrument')).not.toBeNull();
    expect(select('step')).not.toBeNull();
    expect((form.shadowRoot!.getElementById('enrolledDate') as HTMLInputElement).value).toBe(todayIsoDate());

    const courseOptions = Array.from(select('course').options).filter((o) => o.value !== '');
    expect(courseOptions.map((o) => o.textContent)).toEqual([
      'Instrument · Individual · Half Hour · During School',
      'Theory · Group · Hour · After School',
      'Grade 2 Recorder · Group · Half Hour · During School',
    ]);
    expect(Array.from(select('teacher').options).filter((o) => o.value !== '')[0].textContent).toBe('Thabo Nkosi');
  });
});

describe('pm-enrollment-form course type governs instrument and step', { tags: ['268UC17'] }, () => {
  it('offers and requires both for an instrument course, step alone for theory, and neither otherwise', () => {
    form.resetForAdd();

    chooseCourse(instrumentCourse.courseId);
    expect(field('instrumentField').hidden).toBe(false);
    expect(select('instrument').required).toBe(true);
    expect(field('stepField').hidden).toBe(false);
    expect(select('step').required).toBe(true);

    chooseCourse(theoryCourse.courseId);
    expect(field('instrumentField').hidden).toBe(true);
    expect(select('instrument').required).toBe(false);
    expect(field('stepField').hidden).toBe(false);
    expect(select('step').required).toBe(true);

    chooseCourse(recorderCourse.courseId);
    expect(field('instrumentField').hidden).toBe(true);
    expect(field('stepField').hidden).toBe(true);
    expect(select('instrument').required).toBe(false);
    expect(select('step').required).toBe(false);
  });

  it('clears a value carried over from a course type that no longer records it', () => {
    form.resetForAdd();
    chooseCourse(instrumentCourse.courseId);
    select('instrument').value = 'Piano';
    select('step').value = 'Step2A';

    chooseCourse(theoryCourse.courseId);
    expect(select('instrument').value).toBe('');
    expect(select('step').value).toBe('Step2A');

    chooseCourse(recorderCourse.courseId);
    expect(select('step').value).toBe('');
  });

  it('submits only what the course type records', () => {
    const submitted = vi.fn();
    form.addEventListener('enrollment-form-submitted', (event) => submitted((event as CustomEvent).detail.input));

    form.resetForAdd();
    chooseCourse(recorderCourse.courseId);
    select('teacher').value = teacher.teacherId;
    (form.shadowRoot!.getElementById('confirmBtn') as HTMLButtonElement).click();

    expect(submitted).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: recorderCourse.courseId,
        teacherId: teacher.teacherId,
        instrumentType: null,
        stepType: null,
      }),
    );
  });
});

describe('pm-enrollment-form refuses an incomplete enrollment', { tags: ['268UC19'] }, () => {
  it('reports the missing selections and submits nothing', () => {
    const submitted = vi.fn();
    form.addEventListener('enrollment-form-submitted', submitted);

    form.resetForAdd();
    chooseCourse(instrumentCourse.courseId);
    select('teacher').value = teacher.teacherId;
    // Instrument type and step are both required for this course type and both
    // left unchosen.
    (form.shadowRoot!.getElementById('confirmBtn') as HTMLButtonElement).click();

    expect(submitted).not.toHaveBeenCalled();
    expect(select('instrument').checkValidity()).toBe(false);
    expect(select('step').checkValidity()).toBe(false);
  });
});

describe('pm-enrollment-form cancel', { tags: ['268UC20'] }, () => {
  it('announces the cancellation and submits nothing', () => {
    const submitted = vi.fn();
    const cancelled = vi.fn();
    form.addEventListener('enrollment-form-submitted', submitted);
    form.addEventListener('enrollment-form-cancelled', cancelled);

    form.resetForAdd();
    chooseCourse(instrumentCourse.courseId);
    (form.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement).click();

    expect(cancelled).toHaveBeenCalledTimes(1);
    expect(submitted).not.toHaveBeenCalled();
  });
});
