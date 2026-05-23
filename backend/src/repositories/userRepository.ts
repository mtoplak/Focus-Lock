import { pool } from '../db/pool.js'

export type UserRecord = {
  id: string
  google_id: string
  email: string
  name: string | null
  avatar_url: string | null
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    `SELECT id, google_id, email, name, avatar_url
     FROM users WHERE id = $1`,
    [id],
  )
  return result.rows[0] ?? null
}

export async function findUserByGoogleId(
  googleId: string,
): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    `SELECT id, google_id, email, name, avatar_url
     FROM users WHERE google_id = $1`,
    [googleId],
  )
  return result.rows[0] ?? null
}

export async function upsertGoogleUser(input: {
  googleId: string
  email: string
  name: string | null
  avatarUrl: string | null
}): Promise<UserRecord> {
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (google_id, email, name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE SET
       email = EXCLUDED.email,
       name = EXCLUDED.name,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = now()
     RETURNING id, google_id, email, name, avatar_url`,
    [input.googleId, input.email, input.name, input.avatarUrl],
  )
  return result.rows[0]!
}
