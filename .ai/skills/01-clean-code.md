---
name: clean-code
description: Apply SOLID principles, clean naming, and remove code smells in TypeScript/NestJS
triggers: [refactor, rename, simplify, clean, SOLID, smell, improve quality]
applies_to: [all services]
---

# Clean Code Skill

## SOLID Applied to This Project

### Single Responsibility
- One use case class per business operation, one `.execute()` method.
- Domain entity ≠ ORM entity ≠ DTO — they are always separate classes.
- Controllers only validate input and delegate to use cases. Zero business logic.

### Open/Closed
- New behavior → new use case class. Never modify existing ones.
- Extend behavior through new port implementations, not by editing existing ones.

### Liskov Substitution
- Repository adapters must be fully substitutable for their port interface.
- Any mock used in tests must pass the same assertions as the real implementation.

### Interface Segregation
- Ports define only what the current use case needs — no fat interfaces.
- If two use cases need different subsets of a repository, define two ports.

### Dependency Inversion
- Use cases depend on repository interfaces and port interfaces.
- Never import TypeORM, amqplib, or nodemailer inside `domain/` or `application/`.

---

## Naming Rules

**Methods:**
- Express intent: `findPatientById`, not `get`, `fetch`, or `retrieve`.
- Boolean methods: `isActive()`, `canBeCancelled()`, `hasAvailableSlots()`.
- Avoid: `handleData`, `processInfo`, `doStuff`, `execute` on non-use-case classes.

**Variables:**
- Avoid single letters except loop indices (`i`, `j`).
- Avoid generic names: `data`, `result`, `item`, `temp`, `obj`, `response`.
- Arrays/collections → plural noun: `patients`, `schedules`, `appointmentIds`.

**Classes:**
- Use case: `CreatePatientUseCase`, `ConfirmAppointmentUseCase`.
- Repository port: `PatientRepository`, `DoctorRepository`.
- ORM entity: `PatientOrmEntity`, `DoctorOrmEntity`.
- DTO: `CreatePatientDto`, `PatientResponseDto`.

---

## Function Rules

- Max ~20 lines per method. Extract a private method if longer.
- Max 3 parameters. Use an options object or DTO for more.
- No boolean flag parameters — `save(true)` → split into `saveAndPublish()` / `saveQuietly()`.
- Return early to avoid deep nesting:

```typescript
// Bad
async execute(id: string) {
  const patient = await this.repo.findById(id);
  if (patient) {
    if (patient.isActive) {
      // ... 20 lines
    }
  }
}

// Good
async execute(id: string) {
  const patient = await this.repo.findById(id);
  if (!patient) throw new NotFoundException(`Patient ${id} not found`);
  if (!patient.isActive) throw new ConflictException('Patient is not active');
  // ... 
}
```

---

## Comment Rules

Write a comment ONLY when the WHY is non-obvious:
- A hidden constraint (e.g., RabbitMQ `amq.rabbitmq.reply-to` requires `noAck: true`)
- A subtle invariant the reader would miss
- A workaround for a known external bug

**Never write:**
```typescript
// Get patient by id         ← explains WHAT (obvious)
// Loop through each item    ← explains WHAT (obvious)
// Added for issue #123      ← belongs in git history
```

---

## TypeScript Rules

- No `any` without a comment explaining why it's unavoidable.
- Prefer `unknown` over `any` for external data boundaries.
- Use `readonly` on class properties that should not be reassigned.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- Enable `strict: true` in `tsconfig.json` — no exceptions.

---

## Pre-submit Checklist

- [ ] No magic numbers or hardcoded strings
- [ ] No duplicated logic (DRY)
- [ ] Every exported class has JSDoc header with authors
- [ ] No `any` type without justification
- [ ] No commented-out code (remove it — git history preserves it)
- [ ] No `console.log` in production code (use NestJS `Logger`)
- [ ] All edge cases handled at system boundaries only (controllers/DTOs)
- [ ] Dependency arrow points inward — domain has no infra imports
