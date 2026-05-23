import type { ErrorRequestHandler } from 'express'
import { AuthError } from '../auth/errors.js'

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err)
    return
  }

  if (err instanceof AuthError) {
    res.status(err.status).json({
      error: err.code,
      error_description: err.message,
    })
    return
  }

  console.error(err)
  res.status(500).json({
    error: 'server_error',
    error_description: 'Internal server error',
  })
}
