---
name: code-review
description: Checklist and guidelines for reviewing code changes in this project
triggers: [review, PR review, check, audit, feedback]
applies_to: [all services]
---

# Code Review Skill

## Review Process

1. Read the related Gherkin spec in `specs/features/` first — does the implementation match?
2. Check the architecture layer boundaries (no domain → infrastructure imports)
3. Review naming, SOLID, and clean code rules from `01-clean-code.md`
4. Verify test coverage and test quality
5. Check environment variables and security

---

## Architecture Checklist

- [ ] `domain/` has zero imports from `infrastructure/`
- [ ] `application/` has zero imports from `infrastructure/`
- [ ] Controllers contain no business logic — only validation + delegation
- [ ] Domain entities have no TypeORM decorators
- [ ] Use cases depend on interfaces (ports), not concrete implementations
- [ ] New use case = new class; existing use case classes not modified

---

## Code Quality Checklist

- [ ] Every exported class has JSDoc header with all four authors
- [ ] No `any` type without comment justification
- [ ] No magic numbers or hardcoded strings
- [ ] No duplicated logic (DRY)
- [ ] Methods are ≤ 20 lines; complex logic is extracted
- [ ] No commented-out code blocks
- [ ] No `console.log` (use NestJS `Logger`)
- [ ] Early return pattern used to avoid deep nesting

---

## Testing Checklist

- [ ] New code has unit tests co-located (`*.spec.ts`)
- [ ] Tests follow AAA structure (Arrange / Act / Assert)
- [ ] Test names follow `should` / `should not` pattern
- [ ] Happy path tested
- [ ] Failure cases tested (null, not found, invalid input)
- [ ] Events published are verified in tests
- [ ] Only external dependencies are mocked (not domain logic)
- [ ] Coverage ≥ 80% maintained after changes

---

## Security Checklist

- [ ] No secrets, passwords, or tokens hardcoded in source code
- [ ] No `.env` file committed
- [ ] `.env.example` updated with any new variables
- [ ] `ConfigService` used for all config access (no `process.env`)
- [ ] Input validation applied in DTOs with `class-validator`
- [ ] `whitelist: true` and `forbidNonWhitelisted: true` remain in ValidationPipe

---

## API / HTTP Checklist

- [ ] Controllers use specific HTTP decorators (`@Get`, `@Post`, etc.) — not `@All`
- [ ] Correct HTTP status codes (`201` for creation, `204` for deletion, `404` for not found)
- [ ] DTOs have `@IsNotEmpty`, `@MaxLength`, `@IsUUID` constraints where appropriate
- [ ] Response DTOs use `@Exclude` / `@Expose` to control serialization
- [ ] Swagger decorators present on all gateway endpoints

---

## Event / Messaging Checklist

- [ ] Routing key follows pattern `event.<aggregate>.<past-tense-verb>`
- [ ] Event payload matches contract in `contracts/events/domain-events.json`
- [ ] `noAck: true` used in publisher ClientProxy configuration
- [ ] Events published AFTER the domain operation succeeds (not before)

---

## Feedback Tone

When giving feedback, distinguish between:
- **Must fix:** blocks merge (architecture violation, security issue, broken test)
- **Should fix:** strongly recommended (naming, coverage gap, missing JSDoc)
- **Consider:** optional improvement (style preference, minor refactor)
