---
name: testing
description: Write unit and e2e tests for NestJS services following Jest + AAA conventions
triggers: [test, spec, coverage, unit test, e2e, TDD, BDD, scenario]
applies_to: [all modules]
---

# Testing Skill

## Framework & Setup

- **Unit tests:** Jest, co-located with service class (`booking.service.spec.ts`)
- **E2e tests:** Supertest, in `test/` directory (`bookings.e2e-spec.ts`)
- **Minimum coverage:** 80% per service file (`npm run test:cov`)

---

## Test Naming

Use the `should` / `should not` pattern — always a full sentence:

```typescript
it('should return tutor dashboard metrics for the current month');
it('should throw NotFoundException when booking does not exist');
it('should not allow a learner to access the tutor dashboard');
it('should return empty arrays when tutor has no activity');
```

---

## AAA Structure (mandatory)

```typescript
it('should return tutor metrics when tutor has completed sessions', async () => {
  // Arrange
  const clerkId = 'user_abc123';
  mockBookingRepo.count.mockResolvedValue(5);
  mockPaymentRepo.sum.mockResolvedValue(350000);
  mockReviewRepo.average.mockResolvedValue(4.7);

  // Act
  const result = await service.getTutorDashboard(clerkId);

  // Assert
  expect(result.metricas.total_sesiones).toBe(5);
  expect(result.metricas.ingresos_totales).toBe(350000);
  expect(result.metricas.calificacion_promedio).toBe(4.7);
});
```

---

## What to Mock

| Mock                                             | Why                                   |
| ------------------------------------------------ | ------------------------------------- |
| TypeORM repositories (`Repository<Entity>`)      | External DB — slow and stateful       |
| Redis client                                     | External cache — stateful             |
| Pinecone client                                  | External vector DB                    |
| Claude API client                                | External AI service                   |
| Firebase SDK                                     | External notification service         |
| **DO NOT mock** NestJS services under test       | The service IS what you're testing    |
| **DO NOT mock** DTOs or plain TypeScript classes | They are pure TS — test them for real |

### Creating mocks

```typescript
const mockBookingRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  save: jest.fn(),
} as unknown as jest.Mocked<Repository<BookingEntity>>;

const mockClerkJwtGuard = { canActivate: jest.fn().mockReturnValue(true) };
```

### Inject via NestJS Testing module

```typescript
const module = await Test.createTestingModule({
  providers: [
    DashboardService,
    { provide: getRepositoryToken(BookingEntity), useValue: mockBookingRepo },
    { provide: getRepositoryToken(ReviewEntity), useValue: mockReviewRepo },
  ],
}).compile();

service = module.get<DashboardService>(DashboardService);
```

---

## Coverage Requirements

Cover ALL of the following in each service test file:

- **Happy path:** normal execution with valid input and data present
- **Empty state:** when the entity has no records (new tutor, new learner)
- **Not found:** when a required entity does not exist (`NotFoundException`)
- **Forbidden:** when role does not match the endpoint requirement
- **Validation edge cases:** null fields, empty arrays, boundary values
- **Error propagation:** when repository throws, the service re-throws or wraps correctly

---

## E2e Test Template

```typescript
describe('DashboardController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ClerkJwtGuard)
      .useValue({
        canActivate: (ctx) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = { clerkId: 'user_test123', role: UserRole.TUTOR };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /dashboard/tutor → 200', async () => {
    return request(app.getHttpServer())
      .get('/dashboard/tutor')
      .set('Authorization', 'Bearer mock-token')
      .expect(200)
      .expect((res) => {
        expect(res.body.metricas).toBeDefined();
        expect(res.body.proximas_sesiones).toBeInstanceOf(Array);
      });
  });
});
```

---

## Gherkin → Jest Mapping

Map each Gherkin scenario from the user story to a Jest `it()` block:

```gherkin
Scenario: El tutor visualiza sus métricas correctamente
  Given que el tutor ha iniciado sesión
  When accede a su panel principal
  Then el sistema debe mostrar el total de sesiones realizadas
```

Maps to:

```typescript
it('should return total sessions for the current month when tutor has activity', async () => {
  // Arrange — mock completed bookings for current month
  // Act — call service.getTutorDashboard(clerkId)
  // Assert — metricas.total_sesiones > 0
});
```

---

## FIRST Principles Checklist

- [ ] **F**ast — each unit test runs in < 50 ms (no real DB/network/external API)
- [ ] **I**ndependent — no shared mutable state between `it()` blocks
- [ ] **R**epeatable — same result every run, no time/random dependencies
- [ ] **S**elf-validating — `expect()` assertions, no manual inspection needed
- [ ] **T**imely — tests written before or alongside the implementation (not after)
