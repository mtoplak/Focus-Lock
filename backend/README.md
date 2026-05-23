# Focus Lock — Backend

TypeScript + Express API with PostgreSQL and **Google Sign-In**.

## Scripts

```bash
npm install
cp .env.example .env   # add Google OAuth credentials
npm run dev
```

## Stack

- **Express 4** — HTTP server
- **google-auth-library** — Google OAuth 2.0 / OpenID Connect
- **jose** — JWT access tokens
- **PostgreSQL** — users + refresh tokens

## Authentication

See [docs/AUTH.md](./docs/AUTH.md).

| Endpoint | Purpose |
|----------|---------|
| `GET /api/auth/google` | Start sign-in |
| `POST /api/auth/refresh` | Renew tokens |
| `GET /api/auth/me` | Profile (Bearer) |
| `POST /api/auth/logout` | Revoke refresh token |

## Environment

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | Backend callback (default port 3001) |
| `FRONTEND_AUTH_CALLBACK_URL` | Frontend receives tokens (default Vite 5173) |
| `JWT_ACCESS_SECRET` | Access token signing secret |
| `DATABASE_URL` | PostgreSQL connection string |
