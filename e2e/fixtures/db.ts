import { Client } from 'pg';

function createClient(): Client {
  return new Client({
    host: 'localhost',
    port: 5433,
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
