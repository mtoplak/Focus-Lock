import { Router } from 'express'
import { AuthError } from '../auth/errors.js'
import { requireAuth } from '../middleware/requireAuth.js'
import {
  loginWithPassword,
  registerWithPassword,
} from '../services/passwordAuthService.js'
import {
  getUserById,
  logoutSession,
  refreshSession,
} from '../services/sessionService.js'

export const authRouter = Router()

authRouter.post('/auth/register', async (req, res, next) => {
  try {
    const email = req.body?.email
    const password = req.body?.password
    const name = req.body?.name
    if (typeof email !== 'string' || typeof password !== 'string') {
      next(
        new AuthError(
          'invalid_request',
          'email and password are required',
          400,
        ),
      )
      return
    }
    const { user, tokens } = await registerWithPassword({
      email,
      password,
      name: typeof name === 'string' ? name : null,
    })
    res.status(201).json({ user, ...tokens })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/auth/login', async (req, res, next) => {
  try {
    const email = req.body?.email
    const password = req.body?.password
    if (typeof email !== 'string' || typeof password !== 'string') {
      next(
        new AuthError(
          'invalid_request',
          'email and password are required',
          400,
        ),
      )
      return
    }
    const { user, tokens } = await loginWithPassword({ email, password })
    res.json({ user, ...tokens })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/auth/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.body?.refresh_token

    if (typeof refreshToken !== 'string' || !refreshToken) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'refresh_token is required',
      })
      return
    }

    const tokens = await refreshSession(refreshToken)
    res.json(tokens)
  } catch (error) {
    next(error)
  }
})

authRouter.post('/auth/logout', async (req, res, next) => {
  try {
    const refreshToken = req.body?.refresh_token

    if (typeof refreshToken !== 'string' || !refreshToken) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'refresh_token is required',
      })
      return
    }

    await logoutSession(refreshToken)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

authRouter.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    if (!req.auth) {
      throw new AuthError('unauthorized', 'Not authenticated', 401)
    }

    const user = await getUserById(req.auth.sub)
    res.json({ user })
  } catch (error) {
    next(error)
  }
})
