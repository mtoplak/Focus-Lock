# Authentication — Google Sign-In

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/auth/google` | — | Start Google sign-in |
| `GET` | `/api/auth/google/callback` | — | Google redirect (browser) |
| `POST` | `/api/auth/refresh` | — | New access + refresh tokens |
| `POST` | `/api/auth/logout` | — | Revoke refresh token |
| `GET` | `/api/auth/me` | Bearer | Current user profile |

## Google sign-in

1. Open `GET /api/auth/google`
2. After Google, backend redirects to `FRONTEND_AUTH_CALLBACK_URL` with tokens in the query string

## Session API

### Refresh (rotate refresh token)

```http
POST /api/auth/refresh
Content-Type: application/json

{ "refresh_token": "..." }
```

**200**

```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "..."
}
```

The old refresh token is revoked; store the new one.

### Current user

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**200**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane",
    "avatar_url": "https://..."
  }
}
```

### Logout

```http
POST /api/auth/logout
Content-Type: application/json

{ "refresh_token": "..." }
```

**204** — refresh token revoked (idempotent if already invalid).

## Errors

```json
{
  "error": "invalid_grant",
  "error_description": "Refresh token is invalid, expired, or revoked"
}
```

| Code | HTTP | When |
|------|------|------|
| `unauthorized` | 401 | Missing Bearer on `/me` |
| `invalid_token` | 401 | Bad or expired access token |
| `invalid_grant` | 401 | Bad refresh token |
| `invalid_request` | 400 | Missing body fields |

## Environment

See root `.env.example` — `GOOGLE_*`, `JWT_ACCESS_SECRET`, `FRONTEND_AUTH_CALLBACK_URL`.

## Protecting routes

```ts
import { requireAuth } from '../middleware/requireAuth.js'

router.get('/items', requireAuth, (req, res) => {
  const userId = req.auth!.sub
  // ...
})
```
