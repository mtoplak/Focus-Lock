import { pool } from '../db/pool.js'

export async function saveRefreshToken(input: {
  userId: string
  tokenHash: string
  expiresAt: Date
}): Promise<void> {
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [input.userId, input.tokenHash, input.expiresAt],
  )
}

export async function findValidRefreshToken(tokenHash: string) {
  const result = await pool.query<{
    id: string
    user_id: string
    expires_at: Date
  }>(
    `SELECT id, user_id, expires_at
     FROM refresh_tokens
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > now()`,
    [tokenHash],
  )
  return result.rows[0] ?? null
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`,
    [tokenHash],
  )
}
