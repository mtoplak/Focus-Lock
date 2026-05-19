import 'dotenv/config'

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
} as const
