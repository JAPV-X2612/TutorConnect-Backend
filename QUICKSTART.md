# Quick Start — TutorConnect Backend

## Prerequisites

- **Node.js** 20+ — [nodejs.org](https://nodejs.org/)
- **Docker Desktop** — [docker.com](https://www.docker.com/products/docker-desktop/)

---

## Option A: Full Docker (recommended)

```bash
npm install
npm run docker:up
```

Starts PostgreSQL on port `5432` and the backend on port `3000`.

Verify: http://localhost:3000/api/health

---

## Option B: Docker DB + local app

```bash
npm install
npm run docker:dev        # starts PostgreSQL only
npm run start:dev         # starts the app with hot reload
```

---

## Useful commands

```bash
npm run docker:logs       # stream logs
npm run docker:down       # stop all services
npm run docker:build      # stop, rebuild, and restart
docker compose ps         # container status
```

---

## PostgreSQL connection

```
Host:     localhost
Port:     5432
Database: tutorconnect
User:     postgres
Password: postgres123
```

```bash
docker exec -it tutorconnect-postgres psql -U postgres -d tutorconnect
```

---

## Common issues

**Port 5432 in use** — stop local PostgreSQL, or change host port to `5433:5432` in `docker-compose.yml`.

**Port 3000 in use** — change host port in `docker-compose.yml`.

**Health check not responding** — wait 10 s for PostgreSQL to initialize, then check logs: `npm run docker:logs`.
