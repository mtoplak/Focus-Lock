import { Router } from 'express'
import { AuthError } from '../auth/errors.js'
import { env } from '../config/env.js'
import { requireAuth } from '../middleware/requireAuth.js'
import {
  cancelPush,
  deleteSubscription,
  schedulePush,
  upsertSubscription,
} from '../repositories/pushRepository.js'

export const pushRouter = Router()

pushRouter.get('/push/public-key', (_req, res) => {
  res.json({ key: env.push.vapidPublic })
})

pushRouter.post('/push/subscribe', requireAuth, async (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint
    const keys = req.body?.keys
    if (
      typeof endpoint !== 'string' ||
      typeof keys?.p256dh !== 'string' ||
      typeof keys?.auth !== 'string'
    ) {
      throw new AuthError('invalid_request', 'A valid push subscription is required', 400)
    }
    await upsertSubscription({
      userId: req.auth!.sub,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })
    res.status(201).json({ ok: true })
  } catch (error) {
    next(error)
  }
})

pushRouter.post('/push/unsubscribe', requireAuth, async (req, res, next) => {
  try {
    if (typeof req.body?.endpoint === 'string') {
      await deleteSubscription(req.body.endpoint)
    }
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

pushRouter.post('/push/schedule', requireAuth, async (req, res, next) => {
  try {
    const endsAt = req.body?.endsAt
    const mode = req.body?.mode
    if (typeof endsAt !== 'number' || typeof mode !== 'string') {
      throw new AuthError('invalid_request', 'endsAt (ms) and mode are required', 400)
    }
    await schedulePush({ userId: req.auth!.sub, mode, fireAt: new Date(endsAt) })
    res.status(201).json({ ok: true })
  } catch (error) {
    next(error)
  }
})

pushRouter.post('/push/cancel', requireAuth, async (req, res, next) => {
  try {
    await cancelPush(req.auth!.sub)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})
