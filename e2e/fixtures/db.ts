import { Client } from 'pg';

function createClient(): Client {
  return new Client({
    host: 'localhost',
    port: Number(process.env.QA_DB_PORT ?? 5433),
    user: process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
    database: process.env.POSTGRES_DB_QA ?? 'panorama_music_qa',
  });
}

export async function expireInviteToken(email: string): Promise<void> {
  const client = createClient();
  await client.connect();
  try {
    await client.query(
      `UPDATE identity.invite_tokens
       SET expires_at = NOW() - INTERVAL '1 day'
       WHERE user_id = (SELECT user_id FROM identity.users WHERE email = $1)`,
      [email],
    );
  } finally {
    await client.end();
  }
}

export interface WaitingListEntryRow {
  studentId: string;
  lessonStructureId: string;
  instrumentType: string;
  notes?: string | null;
  /** ISO date-time. Defaults to NOW() when omitted, per the table's own default. */
  addedAt?: string;
}

/**
 * Inserts a `students.waiting_list` row directly against Postgres. No capture
 * endpoint exists yet (#293), so this is the only way to seed an entry for a
 * read-only story — see the design's fixture note in e2e-design.md for #292.
 * Only combinations the entity's own rules would allow should be inserted
 * (one entry per student, a real student, a real lesson structure); this
 * helper does not attempt to test `WaitingListEntry`'s own invariants.
 */
export async function insertWaitingListEntry(entry: WaitingListEntryRow): Promise<string> {
  const client = createClient();
  await client.connect();
  try {
    const waitingListEntryId = crypto.randomUUID();
    await client.query(
      `INSERT INTO students.waiting_list
         (waiting_list_entry_id, student_id, lesson_structure_id, instrument_type, notes, added_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))`,
      [
        waitingListEntryId,
        entry.studentId,
        entry.lessonStructureId,
        entry.instrumentType,
        entry.notes ?? null,
        entry.addedAt ?? null,
      ],
    );
    return waitingListEntryId;
  } finally {
    await client.end();
  }
}

/**
 * Empties `students.waiting_list` entirely. Only the empty-state scenario
 * (272IT10, "no waiting-list entries at all") needs this — that behaviour is
 * defined by the absence of data across the whole table, which no filter or
 * scoping control on the page can fake against a shared, parallel-populated
 * database. See the design's isolation note for S3/S4 in e2e-design.md.
 */
export async function truncateWaitingList(): Promise<void> {
  const client = createClient();
  await client.connect();
  try {
    await client.query('TRUNCATE students.waiting_list');
  } finally {
    await client.end();
  }
}
