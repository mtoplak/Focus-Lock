import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { getGoogleAuthUrl } from '../auth/googleClient.js'
import { env } from '../config/env.js'
import { handleGoogleCallback } from '../services/googleAuthService.js'

export const googleAuthRouter = Router()

googleAuthRouter.get('/auth/google', (_req, res) => {
  if (!env.google.clientId || !env.google.clientSecret) {
    res.status(503).json({
      error: 'google_auth_not_configured',
      error_description:
        'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the backend environment',
    })
    return
  }

  const state = randomBytes(16).toString('base64url')
  res.cookie('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    maxAge: 10 * 60 * 1000,
    path: '/',
  })

  res.redirect(getGoogleAuthUrl(state))
})

googleAuthRouter.get('/auth/google/callback', async (req, res, next) => {
  try {
    const error = req.query.error
    if (typeof error === 'string') {
      const description =
        typeof req.query.error_description === 'string'
          ? req.query.error_description
          : 'Google sign-in was cancelled or failed'
      res.redirect(
        `${env.frontendAuthCallbackUrl}?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(description)}`,
      )
      return
    }

    const code = req.query.code
    const state = req.query.state
    const storedState = req.cookies?.oauth_state

    if (typeof code !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing authorization code',
      })
      return
    }

    if (
      typeof state !== 'string' ||
      !storedState ||
      state !== storedState
    ) {
      res.status(400).json({
        error: 'invalid_state',
        error_description: 'OAuth state mismatch',
      })
      return
    }

    res.clearCookie('oauth_state', { path: '/' })

    const redirectUrl = await handleGoogleCallback(code)
    res.redirect(302, redirectUrl)
  } catch (err) {
    next(err)
  }
})
