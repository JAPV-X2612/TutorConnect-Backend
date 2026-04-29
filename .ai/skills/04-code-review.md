---
name: code-review
description: Checklist and guidelines for reviewing code changes in this project
triggers: [review, PR review, check, audit, feedback]
applies_to: [all modules]
---

# Code Review Skill

## Review Process

1. Read the Gherkin scenarios of the related HU — does the implementation match all acceptance criteria?
2. Check NestJS module structure and boundaries (no entity duplicated across modules)
3. Review naming, SOLID, and clean code rules from `01-clean-code.md`
4. Verify test coverage and test quality
5. Check environment variables and security

---

## Architecture Checklist

- [ ] Controllers contain no business logic — only input validation and delegation to services
- [ ] Services contain all business logic — no SQL or TypeORM calls in controllers
- [ ] Entities are not duplicated across modules — imported via `TypeOrmModule.forFeature([])`
- [ ] WebSocket gateways live in `gateways/` subfolder of the owning module
- [ ] `clerkId` is never accepted as path param, query param, or request body
- [ ] New schema changes have an explicit TypeORM migration (no `synchronize: true` shortcut)

---

## Code Quality Checklist

- [ ] Every exported class has JSDoc header with all five authors (`@author | @version | @since`)
- [ ] No `any` type anywhere in the code
- [ ] No magic numbers or hardcoded strings (no hardcoded `clerkId`, commission rates, base URLs)
- [ ] No duplicated logic (DRY)
- [ ] Methods are ≤ 20 lines; complex logic is extracted into private methods
- [ ] No commented-out code blocks (remove — git history preserves it)
- [ ] No `console.log` (use NestJS `Logger`)
- [ ] Early return pattern used to avoid deep nesting

---

## Testing Checklist

- [ ] New service code has co-located unit tests (`*.service.spec.ts`)
- [ ] Tests follow AAA structure (Arrange / Act / Assert)
- [ ] Test names follow `should` / `should not` pattern
- [ ] Happy path tested
- [ ] Empty state tested (new user with no data returns zeros/empty arrays, not error)
- [ ] Failure cases tested (not found, forbidden, invalid input)
- [ ] Only external dependencies mocked (TypeORM repos, Redis, Pinecone, Claude API)
- [ ] Coverage ≥ 80% maintained after changes

---

## Security Checklist

- [ ] No secrets, API keys, or tokens hardcoded in source code
- [ ] `.env` file not staged for commit
- [ ] `.env.example` updated with any new environment variables
- [ ] `ConfigService` used for all configuration access (no `process.env` in service code)
- [ ] Input validation applied in request DTOs with `class-validator`
- [ ] `whitelist: true` and `forbidNonWhitelisted: true` remain in global `ValidationPipe`
- [ ] Protected endpoints use `ClerkJwtGuard`; role-restricted ones also use `RoleGuard`

---

## API / HTTP Checklist

- [ ] Controllers use specific HTTP method decorators (`@Get`, `@Post`, etc.) — not `@All`
- [ ] Correct HTTP status codes (`201` for creation, `204` for deletion, `404` for not found, `403` for forbidden)
- [ ] Request DTOs have appropriate `class-validator` decorators (`@IsNotEmpty`, `@IsUUID`, `@IsEnum`, etc.)
- [ ] `ParseUUIDPipe` applied on `:id` path params to reject invalid UUIDs at the boundary
- [ ] Response bodies never include sensitive fields (passwords, full names of other users, internal IDs)

---

## Real-time / WebSocket Checklist

- [ ] WebSocket events are emitted AFTER the database operation succeeds (not before)
- [ ] Socket.io events follow naming convention: `booking:updated`, `message:received`
- [ ] Redis pub/sub is used for cross-instance broadcasting (MessagingModule)

---

## Feedback Tone

When giving feedback, distinguish between:

- **Must fix:** blocks merge (security violation, broken test, `clerkId` from body, `any` type)
- **Should fix:** strongly recommended (missing JSDoc, coverage gap, naming issue)
- **Consider:** optional improvement (style preference, minor refactor opportunity)
