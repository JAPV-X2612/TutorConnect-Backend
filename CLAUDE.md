# CLAUDE.md — TutorConnect Backend

This file is the primary context document for AI assistants working on this repository.
Read it fully before making any changes.

---

## Project Overview

**TutorConnect** is a marketplace for on-demand academic tutoring in Colombia, connecting university students (learners) with peer tutors. The backend is a **NestJS modular monolith** deployed on AWS ECS Fargate behind an Application Load Balancer.

- **Course:** IETI — Instituto de Educación para el Trabajo e Innovación
- **Repo:** TutorConnect-Backend (this repo) + TutorConnect-Frontend (React Native/Expo, separate repo)
- **Sprint:** 5 (active development)

---

## Team

| Name | GitHub | Role |
|---|---|---|
| Camilo Quintero | @CamiloQ | Full-stack |
| Jesús Pinzón | @JAPV-X2612 | Full-stack |
| Laura Rodríguez | @LauraR | Full-stack |
| Santiago Díaz | @SantiD | Full-stack |
| Sergio Bejarano | @SergioB | Full-stack |

---

## Tech Stack

| Layer | Technology                                                  |
|---|-------------------------------------------------------------|
| Runtime | Node.js 20, TypeScript 5                                    |
| Framework | NestJS 11                                                   |
| ORM | TypeORM 0.3                                                 |
| Database | PostgreSQL (Docker local, AWS RDS prod)                     |
| Auth | Clerk (JWT verification only — backend never issues tokens) |
| Real-time | Socket.io via `@nestjs/websockets`                          |
| Storage | AWS S3 (`@aws-sdk/client-s3`)                               |
| Push Notifications | Firebase Cloud Messaging                                    |
| AI / Vector Search | Claude API + Voyage AI + Pinecone                           |
| Cache | Redis                                                       |
| Webhooks | Svix (Clerk webhook signature verification)                 |
| CI/CD | GitHub Actions → AWS ECS Fargate                            |

---

## Directory Structure

```
src/
  app.module.ts                   # Root module — imports all feature modules
  main.ts                         # Bootstrap: global prefix /api, port 3000, CORS, ValidationPipe
  data-source.ts                  # TypeORM DataSource for CLI migrations (synchronize: false always)
  common/
    enums/
      booking-status.enum.ts      # BookingStatus enum (PENDING_CONFIRMATION, CONFIRMED, ...)
      day-of-week.enum.ts         # DayOfWeek enum (MONDAY … SUNDAY)
      user-role.enum.ts           # UserRole enum (TUTOR, LEARNER)
      user-status.enum.ts         # UserStatus enum
    filters/
      http-exception.filter.ts    # Global HTTP exception filter
  config/
    config.module.ts              # ConfigModule (loads .env)
    configuration.ts              # Typed config factory
  database/
    entities/                     # Legacy entity location — DO NOT add new entities here
      booking.entity.ts           ← BookingEntity lives here (re-exported from modules/bookings/entities/)
      tutor.entity.ts             ← TutorEntity lives here (separate from UserEntity — see §Entities)
      certificacion.entity.ts
    dbservices/                   # Legacy DB services — prefer module-level services for new code
    seeds/
  migrations/                     # All TypeORM migrations — APPEND ONLY, never modify existing
  modules/
    auth/
      clerk-jwt.guard.ts          # ClerkJwtGuard — attaches req.user (see §Auth)
      role.guard.ts               # RoleGuard — reads req.user.role
      role.decorator.ts           # @Roles(...UserRole) decorator
    bookings/
      bookings.controller.ts
      bookings.service.ts
      bookings.gateway.ts         # BookingsGateway (Socket.io) — notifyTutor, notifyLearner
      entities/
        booking.entity.ts         # Re-exports from src/database/entities/booking.entity.ts
    dashboard/
    health/
    messaging/
      gateways/messaging.gateway.ts
    payments/
    reviews/
    search/                       # Stub — SearchService and SearchController are empty TODOs
    tutors/
      entities/
        tutor-availability.entity.ts  # TutorAvailabilityEntity — recurring weekly slots
        tutor-certification.entity.ts
        tutor-course.entity.ts        # TutorCourseEntity — subject, price, duration (minutes)
        tutor-topic.entity.ts
    users/
      entities/
        user.entity.ts            # UserEntity — primary user record
        learner-preference.entity.ts
    webhooks/
  storage/
    storage.service.ts            # AWS S3 upload/presign
```

---

## Auth — Critical Details

**ClerkJwtGuard** validates the Bearer token and attaches a user object to `request.user`. The shape is defined by `ClerkRequestUser`:

```typescript
export interface ClerkRequestUser {
  clerk_id: string;   // ← snake_case — NOT clerkId
  role: UserRole | null;
  sessionId: string;
}
```

**Always use `req.user.clerk_id`** (snake_case) to extract the authenticated user's Clerk ID. Using `req.user.clerkId` (camelCase) will be `undefined`.

```typescript
// ✅ Correct
const clerkId = (req as AuthenticatedRequest).user.clerk_id;

// ❌ Wrong — will be undefined
const clerkId = (req as any).user.clerkId;
```

**RoleGuard** is used with the `@Roles` decorator:

```typescript
@Roles(UserRole.TUTOR)
@UseGuards(ClerkJwtGuard, RoleGuard)
myTutorEndpoint() {}

@Roles(UserRole.LEARNER)
@UseGuards(ClerkJwtGuard, RoleGuard)
myLearnerEndpoint() {}
```

**Role is resolved from the database** (`UserEntity.role`), not from Clerk's publicMetadata. This was a deliberate architectural decision to avoid expensive Clerk API calls and the `user.updated` webhook cycle.

**Global prefix:** all routes are served under `/api`. Example: `POST /api/bookings`.

---

## Entities

### Two entity locations

The codebase has a split between legacy and module-scoped entities. **Always register all entities in `src/data-source.ts`** when adding new ones.

| Entity | File | Table |
|---|---|---|
| `UserEntity` | `src/modules/users/entities/user.entity.ts` | `user` |
| `LearnerPreferenceEntity` | `src/modules/users/entities/learner-preference.entity.ts` | (learner_preference) |
| `TutorEntity` | `src/database/entities/tutor.entity.ts` | (see entity file) |
| `BookingEntity` | `src/database/entities/booking.entity.ts` | `bookings` |
| `TutorAvailabilityEntity` | `src/modules/tutors/entities/tutor-availability.entity.ts` | `tutor_availability` |
| `TutorCourseEntity` | `src/modules/tutors/entities/tutor-course.entity.ts` | `tutor_courses` |
| `TutorCertificationEntity` | `src/modules/tutors/entities/tutor-certification.entity.ts` | (see entity file) |
| `TutorTopicEntity` | `src/modules/tutors/entities/tutor-topic.entity.ts` | (see entity file) |

### Key entity details

**`UserEntity`** — primary record for all platform users.
- `id`: bigint identity (PK)
- `clerkId`: varchar 255, unique (external Clerk identifier)
- `role`: `UserRole` enum (`TUTOR` | `LEARNER`)
- `status`: `UserStatus` enum
- Soft-delete via `deletedAt`

**`TutorEntity`** (legacy, `src/database/entities/tutor.entity.ts`) — tutor profile separate from `UserEntity`. Has `clerkId`, `nombre`, `apellido`. The relationship between `TutorEntity` and `UserEntity` is via `clerkId`. New code should prefer linking via `UserEntity` where possible.

**`BookingEntity`** (`src/database/entities/booking.entity.ts`) — table `bookings`.
- `student` → `UserEntity` (JoinColumn: `student_id`)
- `tutor` → `TutorEntity` (JoinColumn: `tutor_id`) ← NOTE: links to `TutorEntity`, not `UserEntity`
- `course` → `TutorCourseEntity` (JoinColumn: `course_id`, nullable)
- `status`: currently a **string** `'pending' | 'confirmed' | 'completed' | 'cancelled'` — **not the enum** (known technical debt, see §Known Technical Debt)
- `startTime`, `endTime`: timestamps
- `subject`, `price`, `notes`: nullable

**`TutorAvailabilityEntity`** — recurring weekly slots.
- `dayOfWeek`: `DayOfWeek` enum
- `startTime`, `endTime`: time strings (e.g. `"09:00:00"`)
- `tutor` → `UserEntity` (JoinColumn: `tutor_id`) ← links to `UserEntity`, not `TutorEntity`
- Soft-delete via `deletedAt`

**`TutorCourseEntity`** — courses offered by a tutor.
- `subject`: varchar 100
- `price`: float (COP)
- `duration`: int (minutes, default 60)
- `modalidad`: varchar 50
- `isActive`: boolean

---

## Known Technical Debt

These issues exist in the current codebase and are targeted by active sprint tasks:

1. **`BookingEntity.status`** uses string literals (`'pending'`, `'confirmed'`, etc.) instead of `BookingStatus` enum. The enum is defined in `src/common/enums/booking-status.enum.ts` but not yet applied to the entity.

2. **`BookingsService.createBooking()`** does not validate availability or detect conflicts.

3. **`(req as any).user`** pattern exists in some controllers. Always type the request properly using a typed interface extending Express `Request`.

4. **`BookingsService.respondToBooking()`** already exists with `'pending' → 'confirmed' | 'cancelled'` string transition, but does not use the enum or send push notifications.

5. **No `fcmToken` field** on `UserEntity` yet.

6. **No `rejectionReason` field** on `BookingEntity` yet.

7. **SearchModule is a stub** — `search.controller.ts` and `search.service.ts` are empty TODO files.

---

## Database Migrations

**`synchronize: false` is enforced** in `src/data-source.ts` and must never be changed. Every schema change requires an explicit migration.

```bash
# Generate migration (TypeORM diffs entity vs DB)
npm run migration:generate -- src/migrations/AddFcmTokenToUser -d src/data-source.ts

# Review the generated file before running — confirm it only adds what you expect
# Then run it:
npm run migration:run -- -d src/data-source.ts

# Revert last migration:
npm run migration:revert -- -d src/data-source.ts
```

Migrations in `src/migrations/` are **append-only** — never modify an existing migration file. Create a new one to fix a mistake.

After generating a migration: **verify the generated file** adds only the expected column(s) and does not drop or alter unrelated things.

Remember to add new entities to the `entities` array in `src/data-source.ts` so the TypeORM CLI can diff them.

---

## BookingStatus Enum

```typescript
// src/common/enums/booking-status.enum.ts
export enum BookingStatus {
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  CONFIRMED = 'CONFIRMED',
  CANCELLED_BY_LEARNER = 'CANCELLED_BY_LEARNER',
  CANCELLED_BY_TUTOR = 'CANCELLED_BY_TUTOR',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  RESCHEDULED = 'RESCHEDULED',
  EXPIRED = 'EXPIRED',
}
```

State transitions:
- `PENDING_CONFIRMATION` → `CONFIRMED` | `REJECTED` | `EXPIRED`
- `CONFIRMED` → `COMPLETED` | `NO_SHOW` | `CANCELLED_BY_LEARNER` | `CANCELLED_BY_TUTOR` | `RESCHEDULED`

Active statuses (block availability slots): `PENDING_CONFIRMATION`, `CONFIRMED`.

---

## Module Map

| Module | Path | Guards | Description |
|---|---|---|---|
| `AuthModule` | `modules/auth/` | — | ClerkJwtGuard, RoleGuard, @Roles decorator |
| `UsersModule` | `modules/users/` | ClerkJwtGuard | User profile CRUD, learner preferences |
| `TutorsModule` | `modules/tutors/` | ClerkJwtGuard | Tutor onboarding, courses, availability, certifications |
| `BookingsModule` | `modules/bookings/` | ClerkJwtGuard | Booking lifecycle + WebSocket gateway |
| `DashboardModule` | `modules/dashboard/` | ClerkJwtGuard | Metrics for tutor and learner dashboards |
| `MessagingModule` | `modules/messaging/` | ClerkJwtGuard | Real-time chat channels via Socket.io |
| `SearchModule` | `modules/search/` | ClerkJwtGuard | Tutor search — stub, Pinecone AI search to be added |
| `WebhooksModule` | `modules/webhooks/` | Svix signature | Clerk webhook events (user.created, user.updated) |
| `HealthModule` | `modules/health/` | None | `GET /health` liveness probe |
| `StorageModule` | `storage/` | — | AWS S3 upload/presign service |

Modules to be created (Sprint 5):
- `FirebaseModule` — global FCM push notification service

---

## Real-time Events (Socket.io)

**`BookingsGateway`** (`modules/bookings/bookings.gateway.ts`):
- `notifyTutor(tutorClerkId, payload)` — emits to tutor's socket room
- `notifyLearner(learnerClerkId, payload)` — emits to learner's socket room

**`MessagingGateway`** (`modules/messaging/gateways/messaging.gateway.ts`):
- Handles real-time chat between tutor and learner

Frontend connects to the Socket.io server using the Clerk JWT for authentication.

---

## Coding Rules

### General

- TypeScript strict mode — no `any`. Use proper interfaces and types.
- No `(req as any).user` — always define a typed `AuthenticatedRequest` interface.
- Always use `req.user.clerk_id` (snake_case) to extract the Clerk user ID — not `clerkId`.
- Use `BookingStatus` enum values, not string literals.
- All NestJS exceptions must use the framework classes: `BadRequestException`, `NotFoundException`, `ConflictException`, `ForbiddenException`, `UnauthorizedException`.
- No hardcoded credentials or secrets — always read via `ConfigService` from environment variables.

### Database

- `synchronize: false` — never change this.
- Every schema change requires an explicit migration generated with TypeORM CLI.
- Migrations are append-only — never modify an existing migration file.
- After generating a migration, review it before running.
- Register new entities in `src/data-source.ts`.

### Comments

- Write no comments by default. Only add one when the WHY is non-obvious (hidden constraint, workaround, subtle invariant).
- No multi-line comment blocks or narrative docstrings for obvious code.
- JSDoc required format for public service methods: `@author`, `@version`, `@since`.

### Push Notifications

- Firebase `sendToDevice()` is fire-and-forget — never `await` it in a way that blocks the HTTP response.
- If Firebase fails, log a warning and continue — never surface the error to the caller.
- Always check `fcmToken != null` before calling `sendToDevice()`.

### WebSocket Notifications

- WebSocket events complement push notifications — they handle the case when the app is open. Never remove them when adding push.

### Route Order

- Static path segments must be declared before parameterized routes in the same controller. Example: `GET /bookings/tutor/requests` must be declared before `GET /bookings/:id` to avoid Express treating `tutor` as a UUID parameter.

---

## Environment Variables

Required in `.env` (see `.env.example`):

```bash
# App
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:8081,http://localhost:19006

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tutorconnect
# Or individual fields:
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=tutorconnect
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# Clerk (Authentication)
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=   
FIREBASE_CLIENT_EMAIL=

# Redis
REDIS_URL=redis://localhost:6379

# Pinecone Vector DB
PINECONE_API_KEY=
PINECONE_INDEX_NAME=tutor-connect-tutors

# Voyage AI Embeddings
VOYAGE_API_KEY=

# Claude API
ANTHROPIC_API_KEY=
```

---

## JSDoc Format

Required on all public service classes and methods:

```typescript
/**
 * One-line description of what this does.
 *
 * @author Camilo Quintero, Jesús Pinzón, Laura Rodríguez, Santiago Díaz, Sergio Bejarano
 * @version 1.0
 * @since YYYY-MM-DD
 */
```

---

## Local Development

```bash
# Start PostgreSQL via Docker
docker-compose -f docker-compose.local.yml up -d

# Install dependencies
npm install

# Run migrations
npm run migration:run -- -d src/data-source.ts

# Start dev server with hot reload
npm run start:dev

# Run tests
npm test
npm run test:cov
```

---

## What Not to Do

- Never set `synchronize: true` in `data-source.ts` or in `DatabaseModule`.
- Never hardcode credentials — read all secrets from `ConfigService`.
- Never block the HTTP response waiting for a push notification — fire-and-forget.
- Never use `any` types — define proper TypeScript interfaces.
- Never remove WebSocket `notifyTutor()` / `notifyLearner()` calls when adding Firebase push — they are complementary.
- Never modify an existing migration file — create a new one.
- Never read `clerkId` from `req.user.clerkId` — the actual field is `req.user.clerk_id`.
