# TutorConnect Backend — AI Agent Context

> This file is the single source of truth for any AI agent (Claude, Gemini, GitHub Copilot, Cursor, etc.) working on the TutorConnect backend. Read it completely before generating or modifying any code.

---

## 📋 Project Description

**TutorConnect** is an on-demand tutoring and skills marketplace with a commission-per-completed-session business model. It connects learners with verified tutors in academic subjects and practical skills (programming, cooking, mechanics, languages, etc.).

| Attribute | Value |
|---|---|
| **Target market** | University students in Colombia |
| **Business model** | Commission per completed session |
| **Course** | Innovación y Emprendimiento con TI (IETI) |
| **University** | Escuela Colombiana de Ingeniería Julio Garavito |
| **Technical goal** | 100+ concurrent users with real-time capabilities |

---

## 👥 Development Team

| Name | GitHub |
|---|---|
| Camilo Andrés Quintero Rodríguez | [@CamiloQuinteroR](https://github.com/CamiloQuinteroR) |
| Jesús Alfonso Pinzón Vega | [@JAPV-X2612](https://github.com/JAPV-X2612) |
| Laura Daniela Rodríguez Sánchez | [@LauraRo166](https://github.com/LauraRo166) |
| Santiago Díaz Rojas | [@buba-0511](https://github.com/buba-0511) |
| Sergio Andrés Bejarano Rodríguez | [@SergioBejarano](https://github.com/SergioBejarano) |

---

## 🏗️ General Architecture

- **Pattern:** Modular monolith (NOT physically separated microservices)
- **Backend:** NestJS deployed on AWS ECS Fargate behind an Application Load Balancer (ALB)
- **Frontend:** React Native + Expo (APK for Android device)
- **Authentication:** Clerk as Identity Provider (IdP) — the backend **only validates** the JWT; it never issues it or manages passwords
- **Database:** PostgreSQL (AWS RDS in production, Docker locally)
- **Cache:** Redis (sessions, pub/sub for real-time messaging)
- **Vector database:** Pinecone (semantic tutor search)
- **AI model:** Claude API by Anthropic (natural language — HU-10, HU-11)
- **Push notifications:** Firebase
- **File storage:** AWS S3 (tutor certifications)
- **Secrets:** AWS Secrets Manager → exposed as environment variables in ECS Task Definitions

---

## 📦 System Modules

| ID | Module | Path | Responsibility |
|---|---|---|---|
| MOD-AUT-001 | `AuthModule` | `src/modules/auth` | JWT validation (ClerkJwtGuard), role-based access control (RoleGuard) |
| MOD-USR-002 | `UsersModule` | `src/modules/users` | User profiles, CRUD, learner preferences |
| MOD-BUS-003 | `SearchModule` | `src/modules/search` | AI-powered tutor search (Pinecone + Claude API) |
| MOD-RES-004 | `BookingsModule` | `src/modules/bookings` | Session booking lifecycle, real-time updates via WebSocket |
| MOD-MSG-005 | `MessagingModule` | `src/modules/messaging` | Chat channels, message history, Socket.io + Redis pub/sub |
| MOD-REV-006 | `ReviewsModule` | `src/modules/reviews` | Session reviews and rating aggregation |
| MOD-LOG-007 | `AuditModule` | `src/modules/audit` | Audit trail logging |
| — | `TutorsModule` | `src/modules/tutors` | Tutor profiles, courses, certifications, availability |
| — | `DashboardModule` | `src/modules/dashboard` | Aggregated metrics for tutor and learner dashboards |
| — | `PaymentsModule` | `src/modules/payments` | Commission-based payment lifecycle |
| — | `WebhooksModule` | `src/modules/webhooks` | Clerk webhook ingestion (`user.created`, `user.updated`) |
| — | `HealthModule` | `src/modules/health` | Health check endpoint |

---

## 🗄️ Key Entities and Relationships

```
UserEntity (id: uuid, clerkId: unique+indexed, email, role: TUTOR|LEARNER, status)
├── TutorTopicEntity        (tutor FK → user, name)
├── TutorAvailabilityEntity (tutor FK → user, dayOfWeek, startTime, endTime)
├── TutorCertificationEntity (tutor FK → user, fileUrl, fileType, areaTitle)
├── TutorCourseEntity       (tutor FK, subject, price, duration, schedule JSON, modality)
├── LearnerPreferenceEntity (learner FK → user, topic FK → TutorTopicEntity)
├── ChatChannelEntity       (tutor FK, learner FK, unique(tutor, learner))
│   └── MessageEntity       (channel FK, sender FK → user, content, sentAt)
├── BookingEntity           (student FK → user, tutor FK, course FK, status, startTime)
│   ├── PaymentEntity       (booking FK, learner FK, amount, commissionRate, commissionAmount)
│   └── ReviewEntity        (booking FK, learner FK, tutor FK, rating 1-5, comment)
```

### System Enums

| Enum | Values |
|---|---|
| `UserRole` | `TUTOR`, `LEARNER` |
| `UserStatus` | `ACTIVE`, `INACTIVE` |
| `BookingStatus` | `PENDING_CONFIRMATION`, `CONFIRMED`, `COMPLETED`, `CANCELLED_BY_LEARNER`, `CANCELLED_BY_TUTOR`, `REJECTED`, `NO_SHOW`, `RESCHEDULED`, `EXPIRED` |
| `PaymentStatus` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`, `REFUNDED`, `DISPUTED` |
| `DayOfWeek` | `MONDAY` ... `SUNDAY` |
| `CertificationFileType` | `PDF`, `IMAGE`, `DOCUMENT` |

---

## 🔑 Authentication Flow

1. The user authenticates on the frontend via **Clerk**
2. Clerk issues a signed JWT with the user's `clerkId` and `role` in the payload
3. The frontend attaches the JWT in the `Authorization: Bearer <token>` header
4. The backend validates the JWT using `ClerkJwtGuard` (via Clerk SDK)
5. The authenticated `clerkId` is read from `req.user.clerkId` — **NEVER** from query params, path params, or body

### Available Guards (already implemented in `src/modules/auth/`)

```typescript
// JWT validation only
@UseGuards(ClerkJwtGuard)
@Get('me')
getProfile(@Req() req: Request) { ... }

// JWT + role restriction
@UseGuards(ClerkJwtGuard, RoleGuard)
@Roles(UserRole.TUTOR)
@Get('dashboard/tutor')
getTutorDashboard(@Req() req: Request) { ... }
```

---

## 📁 Module File Structure

```
src/
  modules/
    <module>/
      <module>.module.ts
      <module>.controller.ts
      <module>.service.ts
      <module>.service.spec.ts
      entities/            ← subfolder only if 2+ entities
        <entity>.entity.ts
      dto/                 ← subfolder only if 3+ DTOs
        create-<entity>.dto.ts
        update-<entity>.dto.ts
        <entity>.dto.ts
      gateways/            ← only for WebSocket modules
        <module>.gateway.ts
  migrations/
    <Timestamp><MigrationName>.ts
  common/
    enums/
    decorators/
    guards/
  data-source.ts
```

### Scaffolding Rules

- **Flat structure** per module until 3+ files of the same type justify a subfolder
- File names: `kebab-case` with type suffix (`booking.service.ts`, `create-booking.dto.ts`)
- Class names: `PascalCase` with type suffix (`BookingService`, `CreateBookingDto`)
- **Do not duplicate entities** across modules — always import from the owning module using `TypeOrmModule.forFeature([Entity])`

---

## 🗃️ Database Conventions

| Element | Convention | Example |
|---|---|---|
| Table names | `snake_case`, singular | `booking`, `tutor_topic` |
| Column names | `snake_case` | `clerk_id`, `start_time` |
| Enum type names | `snake_case` | `booking_status` |
| Enum values | `SCREAMING_SNAKE_CASE` | `CONFIRMED`, `PENDING_PAYMENT` |
| `clerkId` field | Always decorated with `@Index()` | — |

### Migration Commands

```bash
# Generate migration
npx typeorm migration:generate src/migrations/MigrationName -d src/data-source.ts

# Run migrations
npx typeorm migration:run -d src/data-source.ts
```

> ⚠️ `synchronize: true` is **forbidden** outside the local environment — it can silently drop columns.

---

## 🧠 AI Features (MOD-BUS-003 — SearchModule)

AI functionality is **isolated** in the `SearchModule`. Do not add AI logic to any other module.

| Component | Role |
|---|---|
| **Pinecone** | Vector database — semantic similarity search over tutor profiles |
| **Claude API** | Natural language understanding — extracts subjects and intent from user queries |
| **Redis** | Cache for frequently requested search results |

**Main endpoint:** `POST /tutors/buscar-ia`

---

## 🔄 Real-time Features

| Module | Technology | Purpose |
|---|---|---|
| `BookingsModule` | WebSocket (Socket.io) | Broadcast booking status changes |
| `MessagingModule` | WebSocket (Socket.io) + Redis pub/sub | Real-time message delivery with horizontal scaling |

---

## 🛡️ Security Rules (non-negotiable)

- ❌ NEVER accept `clerkId` as a path param, query param, or request body — always extract from the JWT
- ❌ NEVER issue JWTs or manage passwords — Clerk is the sole identity source
- ❌ NEVER use `synchronize: true` in TypeORM outside the local environment
- ❌ NEVER commit `.env` — only `.env.example` with empty variable names
- ❌ NEVER hardcode credentials, API keys, or secrets — use environment variables
- ✅ ALWAYS apply `ClerkJwtGuard` to all protected endpoints
- ✅ ALWAYS use `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` globally

---

## ✅ Quality Standards

| Standard | Value |
|---|---|
| `any` type | Forbidden — use explicit types or `unknown` at external boundaries |
| Response time | < 500 ms under normal load |
| Minimum test coverage | 80% per service file |
| Code style | ESLint + Prettier (2 spaces, single quotes, always semicolons) |
| Logging | NestJS `Logger` — never `console.log` in production code |
| Principles | SOLID, DRY, KISS, YAGNI |
| JSDoc | Required on all exported classes and interfaces |

---

## 📝 Required JSDoc Format

```typescript
/**
 * Brief, single-sentence description of the class or interface.
 *
 * @author Camilo Quintero, Jesús Pinzón, Laura Rodríguez, Santiago Díaz, Sergio Bejarano
 * @version 1.0
 * @since YYYY-MM-DD
 */
```

---

## ⚡ Required Environment Variables

```bash
# Database
DATABASE_URL=

# Clerk (authentication)
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Redis (cache and pub/sub)
REDIS_URL=

# Pinecone (vector search — MOD-BUS-003)
PINECONE_API_KEY=
PINECONE_INDEX_NAME=

# Claude API (AI — MOD-BUS-003)
ANTHROPIC_API_KEY=

# Firebase (push notifications)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# AWS S3 (tutor certifications)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# Business configuration
SESIONES_META_SEMANAL=5
```
