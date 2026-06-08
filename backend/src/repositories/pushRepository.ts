import { pool } from '../db/pool.js'

export async function upsertSubscription(input: {
  userId: string
  endpoint: string
  p256dh: string
  auth: string
}): Promise<void> {
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth`,
    [input.userId, input.endpoint, input.p256dh, input.auth],
  )
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint])
}

export async function getSubscriptions(userId: string) {
  const result = await pool.query<{
    endpoint: string
    p256dh: string
    auth: string
  }>(
    `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
    [userId],
  )
  return result.rows
}

export async function schedulePush(input: {
  userId: string
  mode: string
  fireAt: Date
}): Promise<void> {
  await pool.query(
    `INSERT INTO scheduled_pushes (user_id, mode, fire_at, sent_at)
     VALUES ($1, $2, $3, NULL)
     ON CONFLICT (user_id) DO UPDATE
       SET mode = EXCLUDED.mode,
           fire_at = EXCLUDED.fire_at,
           sent_at = NULL`,
    [input.userId, input.mode, input.fireAt],
  )
}

export async function cancelPush(userId: string): Promise<void> {
  await pool.query(`DELETE FROM scheduled_pushes WHERE user_id = $1`, [userId])
}

/**
 * Atomically claim every push that is due now, marking it sent in the same
 * statement so concurrent pollers (or overlapping ticks) never double-fire.
 */
export async function claimDuePushes() {
  const result = await pool.query<{ user_id: string; mode: string }>(
    `UPDATE scheduled_pushes SET sent_at = now()
     WHERE sent_at IS NULL AND fire_at <= now()
     RETURNING user_id, mode`,
  )
  return result.rows
}
