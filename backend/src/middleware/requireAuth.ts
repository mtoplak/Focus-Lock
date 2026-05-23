import type { RequestHandler } from 'express'
import { AuthError } from '../auth/errors.js'
import { verifyAccessTokenOrThrow } from '../auth/jwt.js'

export type AuthPayload = Awaited<ReturnType<typeof verifyAccessTokenOrThrow>>

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    next(
      new AuthError(
        'unauthorized',
        'Authorization header with Bearer token is required',
        401,
      ),
    )
    return
  }

  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    next(new AuthError('invalid_token', 'Bearer token is missing', 401))
    return
  }

  try {
    req.auth = await verifyAccessTokenOrThrow(token)
    next()
  } catch (error) {
    next(error)
  }
}
