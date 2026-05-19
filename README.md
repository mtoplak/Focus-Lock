# Focus-Lock

Monorepo with a React PWA frontend and Express API backend.

## Docker

Copy env defaults (optional — compose has fallbacks):

```bash
cp .env.example .env
docker compose up --build
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:8080 |
| Backend  | http://localhost:3001/api/health |
| Adminer  | http://localhost:8081 |
| Postgres | `localhost:5432` (user/db: see `.env.example`) |

### Adminer login

| Field | Value |
|-------|--------|
| System | PostgreSQL |
| Server | `db` (from Adminer container) or `host.docker.internal` if needed |
| Username | `focuslock` (or your `POSTGRES_USER`) |
| Password | `focuslock` (or your `POSTGRES_PASSWORD`) |
| Database | `focuslock` (or your `POSTGRES_DB`) |

Stop: `docker compose down`  
Remove DB data: `docker compose down -v`
