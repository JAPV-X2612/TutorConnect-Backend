# Docker Guide — TutorConnect Backend

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)

Verify installation:

```bash
docker --version
docker compose version
```

---

## Quick Start

```bash
# Start all services (app + PostgreSQL)
npm run docker:up

# Stream logs
npm run docker:logs

# Stop all services
npm run docker:down
```

---

## Services

| Service | Container | Port | Notes |
|---|---|---|---|
| PostgreSQL | `tutorconnect-postgres` | `5432` | DB: `tutorconnect`, user: `postgres`, password: `postgres123` |
| NestJS Backend | `tutorconnect-backend` | `3000` | Health: http://localhost:3000/api/health |

---

## Docker Compose Files

### `docker-compose.yml` — Full stack (app + DB)

```bash
docker compose up -d
docker compose up -d --build   # rebuild images
docker compose logs -f
docker compose down
```

### `docker-compose.dev.yml` — DB only (run app locally)

```bash
docker compose -f docker-compose.dev.yml up -d
npm run start:dev
```

---

## Common Commands

### Container management

```bash
docker compose ps
docker compose stop
docker compose start
docker compose restart
docker stats
```

### Logs

```bash
docker compose logs -f
docker compose logs -f app
docker compose logs -f postgres
docker compose logs --tail=100 app
```

### Shell access

```bash
docker exec -it tutorconnect-backend sh
docker exec -it tutorconnect-postgres sh
docker exec -it tutorconnect-postgres psql -U postgres -d tutorconnect
```

### Volumes

```bash
docker volume ls
docker volume inspect tutorconnect-backend_postgres_data

# WARNING: destroys all data
docker compose down -v
```

---

## Database

**Connection details:**

```
Host:     localhost
Port:     5432
Database: tutorconnect
User:     postgres
Password: postgres123
```

**Connect via psql:**

```bash
# From Docker
docker exec -it tutorconnect-postgres psql -U postgres -d tutorconnect

# From host (requires local psql)
psql -h localhost -p 5432 -U postgres -d tutorconnect
```

**Useful psql commands:**

```sql
\dt          -- list tables
\d <table>   -- describe table
\l           -- list databases
\q           -- quit
```

**Backup / restore:**

```bash
# Backup
docker exec tutorconnect-postgres pg_dump -U postgres tutorconnect > backup.sql

# Restore
cat backup.sql | docker exec -i tutorconnect-postgres psql -U postgres -d tutorconnect
```

---

## Troubleshooting

**Port 5432 already in use:**

Stop local PostgreSQL, or change the host-side port in `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"
```

**Port 3000 already in use:**

```yaml
ports:
  - "3001:3000"
```

**App cannot connect to database:**

1. Check PostgreSQL is healthy: `docker compose ps`
2. Check app logs: `docker compose logs app`
3. Verify env vars in `docker-compose.yml`

**Code changes not reflected:**

The app image is compiled at build time. Rebuild:
```bash
docker compose up -d --build
```

**No space left on device:**

```bash
docker system prune -a --volumes   # removes everything unused
# Or selectively:
docker container prune
docker image prune
docker volume prune
```

---

## Monitoring

```bash
# Resource usage (all containers)
docker stats

# Only TutorConnect containers
docker stats tutorconnect-backend tutorconnect-postgres
```

---

## Production Notes

Change default credentials before deploying. Use environment variables:

```yaml
# docker-compose.yml
environment:
  POSTGRES_DB: tutorconnect
  POSTGRES_USER: ${POSTGRES_USER}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

For secrets management see [Docker Secrets](https://docs.docker.com/engine/swarm/secrets/).
