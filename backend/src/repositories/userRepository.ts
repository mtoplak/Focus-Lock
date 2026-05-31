import { pool } from '../db/pool.js'

export type UserRecord = {
  id: string
  google_id: string | null
  email: string
  name: string | null
  avatar_url: string | null
  password_hash: string | null
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    `SELECT id, google_id, email, name, avatar_url, password_hash
     FROM users WHERE id = $1`,
    [id],
  )
  return result.rows[0] ?? null
}

export async function findUserByGoogleId(
  googleId: string,
): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    `SELECT id, google_id, email, name, avatar_url, password_hash
     FROM users WHERE google_id = $1`,
    [googleId],
  )
  return result.rows[0] ?? null
}

export async function findUserByEmail(
  email: string,
): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>(
    `SELECT id, google_id, email, name, avatar_url, password_hash
     FROM users WHERE lower(email) = lower($1)`,
    [email],
  )
  return result.rows[0] ?? null
}

export async function upsertGoogleUser(input: {
  googleId: string
  email: string
  name: string | null
  avatarUrl: string | null
}): Promise<UserRecord> {
  // If a password-only account already exists for this email, link the
  // Google identity onto it instead of creating a duplicate row.
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (google_id, email, name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE SET
       email = EXCLUDED.email,
       name = EXCLUDED.name,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = now()
     RETURNING id, google_id, email, name, avatar_url, password_hash`,
    [input.googleId, input.email, input.name, input.avatarUrl],
  )
  return result.rows[0]!
}

export async function createPasswordUser(input: {
  email: string
  name: string | null
  passwordHash: string
}): Promise<UserRecord> {
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (email, name, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, google_id, email, name, avatar_url, password_hash`,
    [input.email, input.name, input.passwordHash],
  )
  return result.rows[0]!
}
