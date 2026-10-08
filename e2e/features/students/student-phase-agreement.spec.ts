import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { loginAsRoles } from '../../fixtures/testUsers';
import {
  seedEnrolledStudent,
  seedEnrollmentTarget,
  seedPrivateActivityOnlyStudent,
  studentIdBySurname,
  type SeededEnrollmentTarget,
} from '../../fixtures/enrollment';
import { assignActivity } from '../../fixtures/extraCurriculars';
import { seedListedActivity } from '../../fixtures/studentPrint';
import type { PracticeSlot } from '../../pages/extra-curriculars/ExtraCurricularsPage';
import { StudentsPage } from '../../pages/students/StudentsPage';

const PHASE_MUST_MATCH = "The student's phase must match the phase of their extra-curriculars.";
const NO_ACTIVITIES = 'No extra-curricular activities assigned.';
const DANGER_BORDER = 'rgb(224, 82, 82)';

type ActivityPhase = 'Junior' | 'Senior';

interface Activity {
  description: string;
  phase: ActivityPhase;
  optionLabel: string;
  extraCurricularId: string;
}

/** The banner shown for a refused change; `names` are the held activities that disagree, in held order. */
function refusal(phase: ActivityPhase, names: string[], target: ActivityPhase): string {
  const noun = names.length === 1 ? 'extra-curricular' : 'extra-curriculars';
  return `${PHASE_MUST_MATCH} Remove the ${phase} ${noun} (${names.join(', ')}) before changing the phase to ${target}.`;
}

/** A student has no natural key, so a run is told apart by the surname it gives its students. */
function uniqueSurname(label: string): string {
  return `${label}${Date.now()}W${test.info().workerIndex}`;
}

function uniqueDescription(label: string): string {
  return `e2e-${label}-${Date.now()}-${test.info().workerIndex}`;
}

const SLOTS: PracticeSlot[] = [
  { day: 'Monday', startTime: '15:00' },
  { day: 'Tuesday', startTime: '15:00' },
];

async function signIn(page: Page): Promise<void> {
  await loginAsRoles(page, ['Teacher', 'Coordinator']);
}

async function seedOneActivity(
  page: Page,
  description: string,
  phase: ActivityPhase,
  slot: PracticeSlot = SLOTS[0],
): Promise<Activity> {
  const extraCurricularId = await seedListedActivity(page, { description, phase, practiceTimes: [slot] });
  return { description, phase, optionLabel: `${description} (${phase})`, extraCurricularId };
}

/** A Grade 4 / A1 / Junior student holding a course and each of `activities`. */
async function seedJuniorHolding(
  page: Page,
  target: SeededEnrollmentTarget,
  surname: string,
  activities: Activity[],
): Promise<string> {
  const studentId = await seedEnrolledStudent(page, target, surname);
  for (const activity of activities) {
    await assignActivity(page, studentId, activity.extraCurricularId);
  }
  return studentId;
}

async function openStudents(page: Page): Promise<StudentsPage> {
  await page.reload();
  const studentsPage = new StudentsPage(page);
  await studentsPage.gotoStudents();
  return studentsPage;
}

async function findOnRoster(studentsPage: StudentsPage, surname: string): Promise<void> {
  await studentsPage.filterByName(surname);
  await expect(studentsPage.row(surname)).toBeVisible();
}

async function apiGet<T>(page: Page, path: string): Promise<T> {
  return page.evaluate(async (path) => {
    const response = await fetch(path, {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    return (await response.json()) as T;
  }, path);
}

interface ApiResult {
  status: number;
  error?: string;
}

async function apiSend(page: Page, method: string, path: string, body: unknown): Promise<ApiResult> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const response = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
        },
        body: JSON.stringify(body),
      });
      const parsed = (await response.json().catch(() => ({}))) as { error?: string };
      return { status: response.status, error: parsed.error };
    },
    { method, path, body },
  );
}

interface StudentRecord {
  firstName: string;
  grade: string;
  class: string | null;
  phase: string | null;
}

async function readStudent(page: Page, studentId: string): Promise<StudentRecord> {
  return apiGet<StudentRecord>(page, `/api/students/${studentId}`);
}

interface HeldActivity {
  extraCurricularId: string;
  description: string;
}

async function heldActivities(page: Page, studentId: string): Promise<HeldActivity[]> {
  return apiGet<HeldActivity[]>(page, `/api/students/${studentId}/extra-curriculars`);
}

async function heldActivityIds(page: Page, studentId: string): Promise<string[]> {
  return (await heldActivities(page, studentId)).map((activity) => activity.extraCurricularId);
}

/** Waits for the student's activities to include every one of `activities`. */
async function expectHolds(page: Page, studentId: string, activities: Activity[]): Promise<void> {
  await expect
    .poll(() => heldActivityIds(page, studentId), { timeout: 10_000 })
    .toEqual(expect.arrayContaining(activities.map((activity) => activity.extraCurricularId)));
}

async function expectPhase(page: Page, studentId: string, phase: string | null): Promise<void> {
  await expect.poll(async () => (await readStudent(page, studentId)).phase, { timeout: 10_000 }).toBe(phase);
}

/** Records every PUT or POST the page sends to the student resource itself, so a refusal can be shown to have sent none. */
function recordStudentWrites(page: Page): string[] {
  const writes: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (['PUT', 'POST'].includes(request.method()) && /^\/api\/students(\/[^/]+)?$/.test(path)) {
      writes.push(`${request.method()} ${path}`);
    }
  });
  return writes;
}

function recordDeletes(page: Page): string[] {
  const deletes: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'DELETE') deletes.push(request.url());
  });
  return deletes;
}

async function expectStudentStepRefusal(studentsPage: StudentsPage, text: string): Promise<void> {
  await expect(studentsPage.wizardModal).toHaveAttribute('open', '');
  await expect(studentsPage.wizardModal.locator('#tabStudent')).toHaveAttribute('aria-selected', 'true');
  await expect(studentsPage.studentStepMessage()).toHaveText(text);
  await expect(studentsPage.phaseSelect()).toHaveCSS('border-color', DANGER_BORDER);
}

test.describe('Students — a phase change that leaves held activities disagreeing is refused', { tag: ['@340IT45'] }, () => {
  test('S1 changing the phase to Senior is refused, the activity is named, nothing is removed', async ({ page }) => {
    await signIn(page);
    const choir = await seedOneActivity(page, uniqueDescription('340IT45-S1'), 'Junior');
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('PhaseUp');
    const studentId = await seedJuniorHolding(page, target, surname, [choir]);
    const studentsPage = await openStudents(page);
    const writes = recordStudentWrites(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openEditWizard(surname);
    await studentsPage.changeStudentFields({ phase: 'Senior' });
    await studentsPage.saveEditedStudent();

    await expectStudentStepRefusal(studentsPage, refusal('Junior', [choir.description], 'Senior'));
    expect(writes).toHaveLength(0);
    await studentsPage.wizardModal.locator('#tabExtraCurriculars').click();
    await expect(studentsPage.assignedActivityRow(choir.description)).toBeVisible();

    await studentsPage.wizardModal.locator('#tabStudent').click();
    await studentsPage.closeWizard();
    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await expect(studentsPage.rosterCell(surname, 'Phase')).toHaveText('Junior');
    expect((await readStudent(page, studentId)).phase).toBe('Junior');
    await expectHolds(page, studentId, [choir]);
  });

  test('S2 boundary: several conflicting activities are all named', async ({ page }) => {
    await signIn(page);
    const token = uniqueDescription('340IT45-S2');
    const first = await seedOneActivity(page, `${token}-J1`, 'Junior', SLOTS[0]);
    const second = await seedOneActivity(page, `${token}-J2`, 'Junior', SLOTS[1]);
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('PhaseUpMany');
    const studentId = await seedJuniorHolding(page, target, surname, [first, second]);
    const heldOrder = (await heldActivities(page, studentId)).map((activity) => activity.description);
    expect([...heldOrder].sort()).toEqual([first.description, second.description].sort());
    const studentsPage = await openStudents(page);
    const writes = recordStudentWrites(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openEditWizard(surname);
    await studentsPage.changeStudentFields({ phase: 'Senior' });
    await studentsPage.saveEditedStudent();

    await expectStudentStepRefusal(studentsPage, refusal('Junior', heldOrder, 'Senior'));
    expect(writes).toHaveLength(0);
    await studentsPage.wizardModal.locator('#tabExtraCurriculars').click();
    await expect(studentsPage.assignedActivityRow(first.description)).toBeVisible();
    await expect(studentsPage.assignedActivityRow(second.description)).toBeVisible();
  });

  test('S3 control: a change within the Junior phase is saved', async ({ page }) => {
    await signIn(page);
    const choir = await seedOneActivity(page, uniqueDescription('340IT45-S3'), 'Junior');
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('PhaseKeep');
    const studentId = await seedJuniorHolding(page, target, surname, [choir]);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openEditWizard(surname);
    await studentsPage.changeStudentFields({ grade: 'Grade3' });
    await studentsPage.saveEditedStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await expect(studentsPage.rosterCell(surname, 'Grade')).toHaveText('Grade 3');
    await expect(studentsPage.rosterCell(surname, 'Phase')).toHaveText('Junior');
    await expect
      .poll(async () => {
        const student = await readStudent(page, studentId);
        return `${student.grade}/${student.phase}`;
      })
      .toBe('Grade3/Junior');
    await expectHolds(page, studentId, [choir]);
  });
});

test.describe('Students — a refused phase change is saved once the conflict is resolved', { tag: ['@340IT46'] }, () => {
  test('S1 remove the conflicting activity, Save again, saved as Senior', async ({ page }) => {
    await signIn(page);
    const choir = await seedOneActivity(page, uniqueDescription('340IT46-S1'), 'Junior');
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('PhaseFree');
    const studentId = await seedJuniorHolding(page, target, surname, [choir]);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openEditWizard(surname);
    await studentsPage.changeStudentFields({ phase: 'Senior' });
    await studentsPage.saveEditedStudent();
    await expectStudentStepRefusal(studentsPage, refusal('Junior', [choir.description], 'Senior'));

    await studentsPage.wizardModal.locator('#tabExtraCurriculars').click();
    await studentsPage.removeActivity(choir.description);
    await expect(studentsPage.assignedActivityRow(choir.description)).toHaveCount(0);

    await studentsPage.wizardModal.locator('#tabStudent').click();
    await expect(studentsPage.phaseSelect()).toHaveValue('Senior');
    await studentsPage.saveEditedStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await expect(studentsPage.rosterCell(surname, 'Phase')).toHaveText('Senior');
    await expectPhase(page, studentId, 'Senior');
    await expect.poll(() => heldActivityIds(page, studentId)).not.toContain(choir.extraCurricularId);

    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await expect(studentsPage.rosterCell(surname, 'Phase')).toHaveText('Senior');
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(NO_ACTIVITIES);
  });

  test('S2 setting the phase back also lets Save proceed', async ({ page }) => {
    await signIn(page);
    const choir = await seedOneActivity(page, uniqueDescription('340IT46-S2'), 'Junior');
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('PhaseBack');
    const studentId = await seedJuniorHolding(page, target, surname, [choir]);
    const studentsPage = await openStudents(page);
    const deletes = recordDeletes(page);
    const newFirstName = `Nandi${Date.now()}`;

    await findOnRoster(studentsPage, surname);
    await studentsPage.openEditWizard(surname);
    await studentsPage.changeStudentFields({ firstName: newFirstName, phase: 'Senior' });
    await studentsPage.saveEditedStudent();
    await expectStudentStepRefusal(studentsPage, refusal('Junior', [choir.description], 'Senior'));

    await studentsPage.changeStudentFields({ phase: 'Junior' });
    await studentsPage.saveEditedStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await expect
      .poll(async () => {
        const student = await readStudent(page, studentId);
        return `${student.firstName}/${student.phase}`;
      })
      .toBe(`${newFirstName}/Junior`);
    await expectHolds(page, studentId, [choir]);
    expect(deletes).toHaveLength(0);
  });

  test('S3 negative: removing only one of two conflicting activities is still refused', async ({ page }) => {
    await signIn(page);
    const token = uniqueDescription('340IT46-S3');
    const first = await seedOneActivity(page, `${token}-J1`, 'Junior', SLOTS[0]);
    const second = await seedOneActivity(page, `${token}-J2`, 'Junior', SLOTS[1]);
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('PhaseHalf');
    const studentId = await seedJuniorHolding(page, target, surname, [first, second]);
    const heldOrder = (await heldActivities(page, studentId)).map((activity) => activity.description);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openEditWizard(surname);
    await studentsPage.changeStudentFields({ phase: 'Senior' });
    await studentsPage.saveEditedStudent();
    await expectStudentStepRefusal(studentsPage, refusal('Junior', heldOrder, 'Senior'));

    await studentsPage.wizardModal.locator('#tabExtraCurriculars').click();
    await studentsPage.removeActivity(first.description);
    await expect(studentsPage.assignedActivityRow(first.description)).toHaveCount(0);
    await studentsPage.wizardModal.locator('#tabStudent').click();
    const writes = recordStudentWrites(page);
    await studentsPage.saveEditedStudent();

    await expectStudentStepRefusal(studentsPage, refusal('Junior', [second.description], 'Senior'));
    expect(writes).toHaveLength(0);
    await expectPhase(page, studentId, 'Junior');
  });
});

test.describe('Students — a Private-grade student holding a Senior activity cannot become Junior', { tag: ['@340IT47'] }, () => {
  test('S1 changed to a Junior grade and phase, refused', async ({ page }) => {
    await signIn(page);
    const senior = await seedOneActivity(page, uniqueDescription('340IT47-S1'), 'Senior');
    const surname = uniqueSurname('PrvToGraded');
    const studentId = await seedPrivateActivityOnlyStudent(page, [senior.extraCurricularId], surname);
    const studentsPage = await openStudents(page);
    const writes = recordStudentWrites(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openEditWizard(surname);
    await studentsPage.changeStudentFields({ grade: 'Grade1', class: 'A1', phase: 'Junior' });
    await studentsPage.saveEditedStudent();

    await expectStudentStepRefusal(studentsPage, refusal('Senior', [senior.description], 'Junior'));
    expect(writes).toHaveLength(0);

    await studentsPage.closeWizard();
    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await expect(studentsPage.rosterCell(surname, 'Grade')).toHaveText('Private');
    await expect(studentsPage.rosterCell(surname, 'Phase')).toHaveText('—');
    const student = await readStudent(page, studentId);
    expect(student.grade).toBe('Private');
    expect(student.phase).toBeNull();
    await expectHolds(page, studentId, [senior]);
  });

  test('S2 boundary: a Private student holding both phases is refused for either target', async ({ page }) => {
    await signIn(page);
    const token = uniqueDescription('340IT47-S2');
    const junior = await seedOneActivity(page, `${token}-J1`, 'Junior', SLOTS[0]);
    const senior = await seedOneActivity(page, `${token}-S1`, 'Senior', SLOTS[1]);
    const surname = uniqueSurname('PrvBoth');
    const studentId = await seedPrivateActivityOnlyStudent(
      page,
      [junior.extraCurricularId, senior.extraCurricularId],
      surname,
    );
    const studentsPage = await openStudents(page);
    const writes = recordStudentWrites(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openEditWizard(surname);
    await studentsPage.changeStudentFields({ grade: 'Grade1', class: 'A1', phase: 'Junior' });
    await studentsPage.saveEditedStudent();
    await expectStudentStepRefusal(studentsPage, refusal('Senior', [senior.description], 'Junior'));

    await studentsPage.changeStudentFields({ phase: 'Senior' });
    await studentsPage.saveEditedStudent();
    await expectStudentStepRefusal(studentsPage, refusal('Junior', [junior.description], 'Senior'));

    expect(writes).toHaveLength(0);
    await expectHolds(page, studentId, [junior, senior]);
  });
});

test.describe('Students — a Private-grade student holding a Junior activity can become Junior', { tag: ['@340IT48'] }, () => {
  test('S1 changed to a Junior grade and phase, saved', async ({ page }) => {
    await signIn(page);
    const junior = await seedOneActivity(page, uniqueDescription('340IT48-S1'), 'Junior');
    const surname = uniqueSurname('PrvToJnr');
    const studentId = await seedPrivateActivityOnlyStudent(page, [junior.extraCurricularId], surname);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openEditWizard(surname);
    await studentsPage.changeStudentFields({ grade: 'Grade2', class: 'A1', phase: 'Junior' });
    await studentsPage.saveEditedStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await expect(studentsPage.rosterCell(surname, 'Grade')).toHaveText('Grade 2');
    await expect(studentsPage.rosterCell(surname, 'Phase')).toHaveText('Junior');
    await expect
      .poll(async () => {
        const student = await readStudent(page, studentId);
        return `${student.grade}/${student.phase}`;
      })
      .toBe('Grade2/Junior');
    await expectHolds(page, studentId, [junior]);

    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await studentsPage.toggleRowExpanded(surname);
    await expect(
      studentsPage.visibleExtraCurricularsSummary().locator('.summary__item').filter({ hasText: junior.description }),
    ).toHaveCount(1);
  });

  test('S2 control: moving a Junior student holding a Junior activity to Private is never refused', async ({ page }) => {
    await signIn(page);
    const junior = await seedOneActivity(page, uniqueDescription('340IT48-S2'), 'Junior');
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('JnrToPrv');
    const studentId = await seedJuniorHolding(page, target, surname, [junior]);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openEditWizard(surname);
    await studentsPage.changeStudentFields({ grade: 'Private' });
    await studentsPage.saveEditedStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await expect
      .poll(async () => {
        const student = await readStudent(page, studentId);
        return `${student.grade}/${student.phase}`;
      })
      .toBe('Private/null');
    await expectHolds(page, studentId, [junior]);
  });
});

test.describe('Students — the create wizard refuses a phase that disagrees with staged activities', { tag: ['@340IT49'] }, () => {
  const draft = {
    firstName: 'Palesa',
    dateOfBirth: '2014-05-12',
    grade: 'Grade4' as const,
    class: 'A1' as const,
    phase: 'Junior' as const,
    language: 'English' as const,
  };

  /** Stages `activity` on a Junior draft, steps back, switches the phase to Senior and Saves from the last step. */
  async function stageThenSwitchToSenior(studentsPage: StudentsPage, surname: string, activity: Activity): Promise<void> {
    await studentsPage.startCreatingStudent({ ...draft, lastName: surname });
    await studentsPage.advanceToExtraCurriculars();
    await studentsPage.assignActivity(activity.optionLabel);
    await expect(studentsPage.assignedActivityRow(activity.description)).toBeVisible();
    for (let step = 0; step < 4; step++) await studentsPage.goToPreviousStep();
    await studentsPage.changeStudentFields({ phase: 'Senior' });
    await studentsPage.advanceToExtraCurriculars();
    await studentsPage.saveStudent();
  }

  test('S1 Junior activity staged, phase changed to Senior, create refused', async ({ page }) => {
    await signIn(page);
    const choir = await seedOneActivity(page, uniqueDescription('340IT49-S1'), 'Junior');
    const studentsPage = await openStudents(page);
    const surname = uniqueSurname('CreatePhase');
    const writes = recordStudentWrites(page);

    await stageThenSwitchToSenior(studentsPage, surname, choir);

    await expectStudentStepRefusal(studentsPage, refusal('Junior', [choir.description], 'Senior'));
    expect(writes).toHaveLength(0);

    await studentsPage.advanceToExtraCurriculars();
    await expect(studentsPage.assignedActivityRow(choir.description)).toBeVisible();

    await studentsPage.closeWizard();
    await page.reload();
    await studentsPage.gotoStudents();
    await studentsPage.filterByName(surname);
    await expect(studentsPage.row(surname)).toHaveCount(0);
  });

  test('S2 setting the phase back lets the create proceed', async ({ page }) => {
    await signIn(page);
    const choir = await seedOneActivity(page, uniqueDescription('340IT49-S2'), 'Junior');
    const studentsPage = await openStudents(page);
    const surname = uniqueSurname('CreateBack');

    await stageThenSwitchToSenior(studentsPage, surname, choir);
    await expectStudentStepRefusal(studentsPage, refusal('Junior', [choir.description], 'Senior'));

    await studentsPage.changeStudentFields({ phase: 'Junior' });
    await studentsPage.advanceToExtraCurriculars();
    await studentsPage.saveStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await findOnRoster(studentsPage, surname);
    await expect(studentsPage.rosterCell(surname, 'Phase')).toHaveText('Junior');
    const studentId = await studentIdBySurname(page, surname);
    await expectHolds(page, studentId, [choir]);
  });

  test('S3 control: a Private-grade create holding both phases is never refused', async ({ page }) => {
    await signIn(page);
    const token = uniqueDescription('340IT49-S3');
    const junior = await seedOneActivity(page, `${token}-J1`, 'Junior', SLOTS[0]);
    const senior = await seedOneActivity(page, `${token}-S1`, 'Senior', SLOTS[1]);
    const studentsPage = await openStudents(page);
    const surname = uniqueSurname('CreatePrv');

    await studentsPage.startCreatingStudent({
      firstName: 'Lindiwe',
      lastName: surname,
      dateOfBirth: '2014-05-12',
      grade: 'Private',
      language: 'English',
    });
    await studentsPage.advanceToExtraCurriculars();
    await studentsPage.assignActivity(junior.optionLabel);
    await studentsPage.assignActivity(senior.optionLabel);
    await studentsPage.saveStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await findOnRoster(studentsPage, surname);
    const studentId = await studentIdBySurname(page, surname);
    await expectHolds(page, studentId, [junior, senior]);
  });
});

test.describe('Students — the API refuses a phase change that disagrees with held activities', { tag: ['@340IT50'] }, () => {
  function putBody(surname: string, firstName: string, grade: string, studentClass: string, phase: string) {
    return {
      firstName,
      lastName: surname,
      dateOfBirth: '2014-05-12',
      grade,
      class: studentClass,
      phase,
      language: 'English',
    };
  }

  test('S1 a PUT to Senior is refused and nothing is written', async ({ page }) => {
    await signIn(page);
    const choir = await seedOneActivity(page, uniqueDescription('340IT50-S1'), 'Junior');
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('ApiUp');
    const studentId = await seedJuniorHolding(page, target, surname, [choir]);
    const newFirstName = `Nandi${Date.now()}`;

    const result = await apiSend(
      page,
      'PUT',
      `/api/students/${studentId}`,
      putBody(surname, newFirstName, 'Grade5', 'E1', 'Senior'),
    );

    expect(result.status).toBe(400);
    expect(result.error).toBe(PHASE_MUST_MATCH);
    const student = await readStudent(page, studentId);
    expect(student).toMatchObject({ firstName: 'Amara', grade: 'Grade4', class: 'A1', phase: 'Junior' });
    await expectHolds(page, studentId, [choir]);
  });

  test('S2 control: the same request staying Junior is accepted', async ({ page }) => {
    await signIn(page);
    const choir = await seedOneActivity(page, uniqueDescription('340IT50-S2'), 'Junior');
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('ApiStay');
    const studentId = await seedJuniorHolding(page, target, surname, [choir]);
    const newFirstName = `Nandi${Date.now()}`;

    const result = await apiSend(
      page,
      'PUT',
      `/api/students/${studentId}`,
      putBody(surname, newFirstName, 'Grade3', 'A1', 'Junior'),
    );

    expect(result.status).toBe(200);
    await expect
      .poll(async () => {
        const student = await readStudent(page, studentId);
        return `${student.firstName}/${student.grade}`;
      })
      .toBe(`${newFirstName}/Grade3`);
    await expectHolds(page, studentId, [choir]);
  });

  test('S3 negative: a PUT moving a Private student holding a Senior activity to a Junior phase is refused', async ({
    page,
  }) => {
    await signIn(page);
    const senior = await seedOneActivity(page, uniqueDescription('340IT50-S3'), 'Senior');
    const surname = uniqueSurname('ApiPrv');
    const studentId = await seedPrivateActivityOnlyStudent(page, [senior.extraCurricularId], surname);

    const result = await apiSend(
      page,
      'PUT',
      `/api/students/${studentId}`,
      putBody(surname, 'Amara', 'Grade1', 'A1', 'Junior'),
    );

    expect(result.status).toBe(400);
    expect(result.error).toBe(PHASE_MUST_MATCH);
    const student = await readStudent(page, studentId);
    expect(student.grade).toBe('Private');
    expect(student.phase).toBeNull();
    await expectHolds(page, studentId, [senior]);
  });
});
