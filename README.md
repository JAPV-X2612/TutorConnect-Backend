# TutorConnect Backend

NestJS backend for **TutorConnect** — a marketplace connecting university students with peer tutors in Colombia.

---

## Documentation

| File                                           | Description                                         |
| ---------------------------------------------- | --------------------------------------------------- |
| [QUICKSTART.md](./QUICKSTART.md)               | Start the project in 2 steps                        |
| [DOCKER.md](./DOCKER.md)                       | Full Docker reference                               |
| [CLAUDE.md](./CLAUDE.md)                       | Architecture, conventions, and AI assistant context |
| [PENDING_AWS_TASKS.md](./PENDING_AWS_TASKS.md) | Manual AWS infrastructure tasks                     |

---

## Tech Stack

| Layer     | Technology                       |
| --------- | -------------------------------- |
| Framework | NestJS 11 + TypeScript 5         |
| ORM       | TypeORM 0.3                      |
| Database  | PostgreSQL 16                    |
| Auth      | Clerk (JWT verification)         |
| Real-time | Socket.io                        |
| Storage   | AWS S3                           |
| CI/CD     | GitHub Actions → AWS ECS Fargate |

---

## Project Structure

```
src/
  app.module.ts          # Root module
  main.ts                # Bootstrap (port 3000, global prefix /api)
  data-source.ts         # TypeORM CLI DataSource (synchronize: false)
  common/                # Shared enums, filters
  config/                # Environment configuration
  database/              # Legacy entities and DB module
  migrations/            # TypeORM migrations (append-only)
  modules/
    auth/                # ClerkJwtGuard, RoleGuard, @Roles decorator
    users/               # User profiles, learner preferences
    tutors/              # Tutor onboarding, courses, availability
    bookings/            # Booking lifecycle + WebSocket gateway
    dashboard/           # Metrics for tutor and learner dashboards
    messaging/           # Real-time chat (Socket.io)
    search/              # Tutor search (Pinecone AI — Sprint 5)
    webhooks/            # Clerk webhook events
    health/              # GET /api/health
  storage/               # AWS S3 service
```

---

## Getting Started

See [QUICKSTART.md](./QUICKSTART.md).

```bash
npm install
npm run docker:dev    # start PostgreSQL
npm run start:dev     # start app with hot reload
```

Health check: http://localhost:3000/api/health

---

## Database Migrations

```bash
# Generate (after modifying an entity)
npm run migration:generate -- src/migrations/<MigrationName> -d src/data-source.ts

# Run
npm run migration:run -- -d src/data-source.ts

# Revert
npm run migration:revert -- -d src/data-source.ts
```

> `synchronize: false` is enforced. All schema changes require an explicit migration.

---

## Scripts

| Script                | Description                |
| --------------------- | -------------------------- |
| `npm run start:dev`   | Dev server with hot reload |
| `npm run build`       | Compile TypeScript         |
| `npm run start:prod`  | Run compiled output        |
| `npm test`            | Unit tests                 |
| `npm run test:cov`    | Coverage report            |
| `npm run test:e2e`    | End-to-end tests           |
| `npm run lint`        | ESLint                     |
| `npm run format`      | Prettier                   |
| `npm run docker:up`   | Start all Docker services  |
| `npm run docker:dev`  | Start PostgreSQL only      |
| `npm run docker:down` | Stop all Docker services   |
| `npm run docker:logs` | Stream Docker logs         |

---

## License

See [LICENSE](./LICENSE).
