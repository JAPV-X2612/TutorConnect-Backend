---
name: clean-code
description: Apply SOLID principles, clean naming, and remove code smells in TypeScript/NestJS
triggers: [refactor, rename, simplify, clean, SOLID, smell, improve quality]
applies_to: [all modules]
---

# Clean Code Skill

## SOLID Applied to This Project

### Single Responsibility

- Each NestJS service method handles one business operation.
- Controllers only validate input and delegate to services. Zero business logic in controllers.
- Entity ≠ DTO — they are always separate classes. Never expose entities directly in API responses.

### Open/Closed

- New business behavior → new service method or new service class. Avoid modifying existing methods unnecessarily.
- Extend functionality through new DTOs and new endpoints rather than adding flags to existing ones.

### Liskov Substitution

- Any mock repository used in tests must be substitutable for the real TypeORM repository.

### Interface Segregation

- DTOs define only what each endpoint needs — no fat request/response objects that mix concerns.
- If two endpoints need different subsets of data, define two separate DTOs.

### Dependency Inversion

- Services depend on TypeORM repositories injected via NestJS DI, not on concrete implementations.
- Never import module-specific entities directly in other modules — use `TypeOrmModule.forFeature([Entity])`.

---

## Naming Rules

**Methods:**

- Express intent: `findBookingById`, not `get`, `fetch`, or `retrieve`.
- Boolean methods: `isAvailable()`, `canBeCancelled()`, `hasCompletedSessions()`.
- Avoid: `handleData`, `processInfo`, `doStuff`.

**Variables:**

- Avoid single letters except loop indices (`i`, `j`).
- Avoid generic names: `data`, `result`, `item`, `temp`, `obj`, `response`.
- Arrays/collections → plural noun: `bookings`, `tutors`, `sessionIds`.

**Classes:**

- Service: `BookingService`, `DashboardService`.
- Entity: `BookingEntity`, `UserEntity`.
- DTO: `CreateBookingDto`, `TutorDashboardDto`.
- Guard: `ClerkJwtGuard`, `RoleGuard`.

---

## Function Rules

- Max ~20 lines per method. Extract a private method if longer.
- Max 3 parameters. Use a DTO or options object for more.
- No boolean flag parameters — split into two clear methods instead.
- Return early to avoid deep nesting:

```typescript
// Bad
async getBooking(id: string, clerkId: string) {
  const booking = await this.repo.findOne({ where: { id } });
  if (booking) {
    if (booking.student.clerkId === clerkId) {
      // ... 20 lines
    }
  }
}

// Good
async getBooking(id: string, clerkId: string) {
  const booking = await this.repo.findOne({ where: { id } });
  if (!booking) throw new NotFoundException(`Booking ${id} not found`);
  if (booking.student.clerkId !== clerkId) throw new ForbiddenException();
  // ...
}
```

---

## Comment Rules

Write a comment ONLY when the WHY is non-obvious:

- A hidden constraint (e.g., Clerk JWT TTL is 60s — the SDK rotates automatically)
- A subtle invariant (e.g., `synchronize: true` is forbidden outside local)
- A workaround for a known external bug

**Never write:**

```typescript
// Get booking by id         ← explains WHAT (obvious)
// Loop through each item    ← explains WHAT (obvious)
// Added for issue #123      ← belongs in git history
```

---

## TypeScript Rules

- No `any` — prohibited in this project. Use explicit types or `unknown` at external boundaries.
- Use `readonly` on class properties that should not be reassigned.
- Prefer `interface` for object shapes, `type` for unions/intersections.
- `strict: true` in `tsconfig.json` — no exceptions.

---

## Pre-submit Checklist

- [ ] No magic numbers or hardcoded strings (no hardcoded `clerkId`, commission rates, or base URLs)
- [ ] No duplicated logic (DRY)
- [ ] Every exported class has JSDoc header (`@author | @version | @since`)
- [ ] No `any` type anywhere
- [ ] No commented-out code (remove it — git history preserves it)
- [ ] No `console.log` in production code (use NestJS `Logger`)
- [ ] Input validation applied only in DTOs (controllers and services trust validated data)
- [ ] `clerkId` never accepted as path param, query param, or request body
