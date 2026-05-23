import 'dotenv/config'

const nodeEnv = process.env.NODE_ENV ?? 'development'
const isProduction = nodeEnv === 'production'

const DEV_JWT_SECRET = 'dev-only-jwt-secret-change-before-production-32+'
const jwtSecret =
  process.env.JWT_ACCESS_SECRET ??
  (isProduction ? undefined : DEV_JWT_SECRET)

if (!jwtSecret) {
  throw new Error('JWT_ACCESS_SECRET is required in production')
}

if (isProduction && jwtSecret.length < 32) {
  throw new Error('JWT_ACCESS_SECRET must be at least 32 characters in production')
}

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

if (isProduction && (!googleClientId || !googleClientSecret)) {
  throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in production')
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv,
  isProduction,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://focuslock:focuslock@localhost:5432/focuslock',
  runMigrationsOnStart:
    process.env.RUN_MIGRATIONS_ON_START === 'true' ||
    (process.env.RUN_MIGRATIONS_ON_START !== 'false' && !isProduction),
  jwt: {
    secret: jwtSecret,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 30),
  },
  google: {
    clientId: googleClientId ?? '',
    clientSecret: googleClientSecret ?? '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:3001/api/auth/google/callback',
  },
  frontendAuthCallbackUrl:
    process.env.FRONTEND_AUTH_CALLBACK_URL ??
    'http://localhost:5173/auth/callback',
} as const
