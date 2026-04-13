# CLAUDE.md — TutorConnect Backend

## Project Overview

**TutorConnect** is an on-demand tutoring marketplace that connects learners with verified
tutors across academic subjects and practical skills (languages, cooking, mechanics, etc.).
The platform is commission-based: TutorConnect retains a percentage of each completed and
paid session. Core differentiators are AI-powered tutor matching and a real-time
bidirectional chat system.

This file is the authoritative guide for every code-generation, refactoring, and review
task performed by Claude Code on the backend codebase.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (LTS) |
| Framework | NestJS |
| Package manager | npm |
| Language | TypeScript (strict mode) |
| Primary database | PostgreSQL (Docker container) |
| Vector database | Pinecone |
| Cache / Pub-Sub | Redis (ElastiCache in production) |
| Authentication | Clerk (Google, Microsoft, GitHub, and others) |
| Push notifications | Firebase Cloud Messaging (future) |
| Payments | Stripe / PayU (simulated — no real transactions) |
| Video calls | External provider (Google Meet / Microsoft Teams token generation) |
| AI / LLM | AWS Bedrock (Claude / Titan), OpenAI API, AWS SageMaker |
| Search | AWS OpenSearch + Pinecone embeddings |
| Containerisation | Docker + Docker Compose |
| CI/CD | Docker + AWS (ECS Fargate, CodePipeline, ECR) |
| Observability | AWS CloudWatch, X-Ray, CloudTrail |

---

## Modular Architecture

The backend is a **modular monolith** — one deployable NestJS application divided into
bounded-context modules. Each module owns its domain logic, its database entities, and its
external integrations. Modules communicate through NestJS dependency injection or internal
events; they never import each other's repositories directly.

### Module registry

| Code | Name | Responsibility |
|---|---|---|
| `MOD-AUT-001` | Authentication Module | Clerk JWT validation, role guards, OAuth federation |
| `MOD-USR-002` | Users Module | Learner/tutor profiles, preferences, certifications |
| `MOD-BUS-003` | Search & AI Module | Full-text search, Pinecone embeddings, LLM chatbot, personalised recommendations |
| `MOD-RES-004` | Bookings Module | Session scheduling, calendar, confirm/reject/cancel flows |
| `MOD-MSG-005` | Messaging Module | Bidirectional WebSocket chat, message persistence, delivery status |
| `MOD-REV-006` | Reviews & KPIs Module | Ratings, NPS, retention rate, revenue KPIs, KPI snapshots |
| `MOD-LOG-007` | Audit Logs Module | Structured audit trail, event sourcing, CloudWatch integration |

---

## Database

### Engine

PostgreSQL running in a Docker container. The connection is managed by TypeORM.
Always check the existing `docker-compose.yml` and `src/database` directory before
adding new configuration.

### Naming conventions (mandatory)

- **Tables / entities**: `snake_case`, **singular** (e.g. `booking`, `chat_channel`).
- **Columns**: `snake_case`.
- **Enum types**: `snake_case` name, `SCREAMING_SNAKE_CASE` values.
- **Primary keys**: `Long` / `bigint` with `IDENTITY` generation strategy, or `UUID` where
  cross-system portability is required.
- **Timestamps**: every entity exposes `created_at`, `updated_at`, and `deleted_at`
  (soft-delete pattern).

### Established enumerations

```sql
CREATE TYPE user_role   AS ENUM ('TUTOR', 'LEARNER');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE booking_status AS ENUM (
  'PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED_BY_LEARNER',
  'CANCELLED_BY_TUTOR', 'REJECTED', 'COMPLETED', 'NO_SHOW',
  'RESCHEDULED', 'EXPIRED'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED',
  'CANCELLED', 'REFUNDED', 'DISPUTED'
);

CREATE TYPE certification_file_type AS ENUM ('PDF', 'JPG', 'PNG', 'DOCX');
```

---

## Code Standards

### Language

**All code, comments, JSDoc, log messages, error messages, and commit messages must be
written in formal English.** The application serves Spanish-speaking users, but the
codebase is English-only without exception.

### TypeScript

- `strict: true` in `tsconfig.json` — no implicit `any`, no non-null assertion abuse.
- Prefer `readonly` properties and immutable data structures where applicable.
- Use `type` for unions/intersections; use `interface` for object shapes that may be
  extended.
- Never use `any`. Use `unknown` and narrow with type guards.

### Formatting & style

- 2-space indentation.
- Single quotes for strings.
- Trailing commas in multi-line structures.
- Max line length: 100 characters.
- ESLint + Prettier configured at the repository root — all generated code must pass
  linting without modifications.

### Documentation

- Every public class, method, and function must have a JSDoc block.
- Use `@param`, `@returns`, `@throws`, and `@example` where relevant.
- Include `@author` only on new files: `@author TutorConnect Team`.
- Complex business rules (e.g. NPS formula, commission calculation) must be documented
  inline with the formula and its source.

---

## Design Principles (non-negotiable)

| Principle | Application |
|---|---|
| **SOLID** | Single responsibility per class/service; depend on abstractions (interfaces), not concretions; open for extension via strategy/adapter patterns |
| **DRY** | Extract shared logic into utilities, base classes, or shared modules; never duplicate validation or transformation logic |
| **KISS** | Prefer the simplest solution that satisfies requirements; avoid speculative abstractions |
| **YAGNI** | Do not implement features or abstractions not required by the current task |

---

## Design Patterns

Apply the most appropriate pattern for each context. The following are baseline
expectations — do not invent structure where none is needed.

### Creational
- **Factory / Abstract Factory**: provider instantiation (payment gateways, LLM adapters).
- **Builder**: complex query construction, DTO assembly.

### Structural
- **Adapter**: every third-party integration (`IPaymentGateway`, `ILLMProvider`,
  `INotificationProvider`) must be behind an adapter interface.
- **Facade**: simplify cross-module orchestration (e.g. booking + payment + notification).
- **Decorator**: NestJS interceptors for logging, caching, and transformation.

### Behavioural
- **Strategy**: interchangeable LLM providers, payment providers.
- **Observer / Event-Driven**: domain events via NestJS `EventEmitter2` for async
  side-effects (e.g. `BookingConfirmedEvent` triggers notification + calendar sync).
- **SAGA**: distributed transaction for the booking → payment → confirmation flow.
- **CQRS**: separate read and write models for the KPI dashboard and audit log queries.
- **Circuit Breaker**: wrap all external HTTP calls (AI APIs, payment gateways) with a
  circuit breaker (e.g. `opossum`).

### Architectural
- **Repository pattern**: all database access goes through a repository abstraction.
- **Unit of Work**: group related database operations into a single transaction.
- **API Gateway pattern**: all client requests enter through a single NestJS entry point.
- **Pub/Sub**: Redis channels for real-time WebSocket message broadcasting.

---

## Quality Attributes

Every implementation decision must consider the following attributes:

| Attribute | Expectation |
|---|---|
| **Scalability** | Support 100+ concurrent users; stateless services; horizontal scaling via ECS Fargate Auto Scaling |
| **Availability** | Multi-AZ deployment; health checks on every service; automatic container restart |
| **Performance** | p95 API latency ≤ 2 s; Redis caching for hot read paths; read replicas for analytics queries |
| **Security** | JWT validation on every protected route via Clerk; RBAC with `TUTOR` / `LEARNER` / `ADMIN` roles; input sanitisation against XSS/SQLi; secrets via AWS Secrets Manager |
| **Observability** | Structured JSON logs (Winston + CloudWatch); distributed tracing (AWS X-Ray); audit trail for every state-changing transaction |
| **Maintainability** | Module boundary discipline; ≥ 80% unit test coverage per module; no circular dependencies |
| **Extensibility** | New payment providers or LLM models must be addable by implementing an interface and registering an adapter — zero changes to core business logic |
| **Portability** | Docker-first; environment configuration via `.env` + AWS Parameter Store |

---

## Real-Time & Concurrency

- WebSocket gateway is implemented in `MOD-MSG-005` using `@WebSocketGateway` from
  `@nestjs/websockets` with the `socket.io` adapter.
- Active connections are tracked in **Redis** (key: `ws:connections:{userId}`).
- Messages are broadcast via **Redis Pub/Sub** to support horizontal scaling.
- Message persistence uses **PostgreSQL** (`message` table) for the source of truth.
- Only **learners** may initiate a new conversation with a tutor. The backend enforces
  this rule at the service layer regardless of client input.
- WebSocket connections require a valid Clerk JWT passed as a query parameter on handshake.

---

## Domain-Specific Business Rules

These rules must be enforced at the service layer — not only in DTOs or guards.

1. A booking may only be created if the tutor has an availability slot matching the
   requested `scheduled_at` and `duration_minutes`.
2. A session may only be reviewed (rated) if its `booking_status` is `COMPLETED`.
3. Only one review per booking per learner is allowed (unique constraint on
   `(booking_id, learner_id)` in the `review` table — note: the MER spells it `rerview`;
   correct to `review` in all new code).
4. The payment flow follows the SAGA pattern:
   `PENDING → PROCESSING → COMPLETED | FAILED | CANCELLED`.
5. TutorConnect's commission is calculated as `commission_amount = amount * commission_rate`
   and stored on the `payment` entity at the time of transaction.
6. KPI snapshots are pre-computed and stored daily in the `kpi_snapshot` table.
   The dashboard must read from snapshots — never recalculate on demand.
7. NPS = `% ratings(5) − % ratings(1 or 2)` over the selected period.
8. Retention rate = `% learners who booked in month M+1` given they booked in month M.
9. Chat channels are created automatically when a booking transitions to `CONFIRMED`.
   Cancelled or expired bookings put the channel into read-only mode.
10. Video call tokens are generated server-side and returned to the client; the actual
    media stream is handled entirely by the external provider.

---

## Project Structure (expected)

```
apps/
  backend/
    src/
      modules/
        auth/          # MOD-AUT-001
        users/         # MOD-USR-002
        search/        # MOD-BUS-003
        bookings/      # MOD-RES-004
        messaging/     # MOD-MSG-005
        reviews/       # MOD-REV-006
        audit/         # MOD-LOG-007
      common/
        decorators/
        filters/
        guards/
        interceptors/
        pipes/
        utils/
      config/
      database/
    test/
    docker-compose.yml
    Dockerfile
    .env.example
```

---

## Testing

- **Unit tests**: Jest. Every service class must have a corresponding `.spec.ts` file.
- **Integration tests**: NestJS testing module with an in-memory or test-container
  PostgreSQL instance.
- **Test rule (absolute)**: test files are never modified to make tests pass. Only
  implementation code is adjusted until all tests pass.
- Aim for ≥ 80% statement coverage per module.
- Mock all external providers (Clerk, Stripe, OpenAI, Firebase) in unit tests.

---

## Environment Variables

Never hardcode secrets. Always read from `process.env` via the NestJS `ConfigModule`.
Provide a fully documented `.env.example` at the project root.

Required variables include (non-exhaustive):

```
DATABASE_URL
REDIS_URL
CLERK_SECRET_KEY
CLERK_PUBLISHABLE_KEY
PINECONE_API_KEY
PINECONE_INDEX
OPENAI_API_KEY
AWS_REGION
AWS_BEDROCK_MODEL_ID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY
```

---

## Git & Branching

- Branch naming: `feature/<module-code>-<short-description>` (e.g.
  `feature/MOD-MSG-005-websocket-gateway`).
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`,
  `chore:`, `docs:`.
- Pull requests require passing CI (lint + tests) before merge.

---

## What Claude Code Must Never Do

- Modify existing test files.
- Hardcode secrets, API keys, or connection strings.
- Add dependencies without checking if an existing utility already covers the use case
  (YAGNI).
- Create circular module dependencies.
- Bypass the repository abstraction and call TypeORM repositories directly from
  controllers.
- Return raw database errors to the client — always map to structured `HttpException`
  responses.
- Implement features not requested in the current task, even if they seem useful.
