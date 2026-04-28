---
name: testing
description: Write unit and e2e tests for NestJS services following Jest + AAA conventions
triggers: [test, spec, coverage, unit test, e2e, TDD, BDD, scenario]
applies_to: [all services]
---

# Testing Skill

## Framework & Setup

- **Unit tests:** Jest, co-located with class (`create-patient.use-case.spec.ts`)
- **E2e tests:** Supertest, in `test/` directory (`patients.e2e-spec.ts`)
- **Minimum coverage:** 80% (`npm run test:cov`)
- **Coverage format:** lcov (uploaded to SonarCloud)

---

## Test Naming

Use the `should` / `should not` pattern — always a full sentence:

```typescript
it('should create a patient and publish a registered event')
it('should throw NotFoundException when patient does not exist')
it('should not allow duplicate email registration')
it('should return 204 when patient is successfully deleted')
```

---

## AAA Structure (mandatory)

```typescript
it('should return the patient when found by id', async () => {
  // Arrange
  const patient = Patient.create({ firstName: 'John', ... });
  mockRepository.findById.mockResolvedValue(patient);

  // Act
  const result = await useCase.execute({ id: patient.id });

  // Assert
  expect(result.id).toBe(patient.id);
  expect(result.firstName).toBe('John');
});
```

---

## What to Mock

| Mock | Why |
|---|---|
| TypeORM repositories | External DB — slow and stateful |
| RabbitMQ ClientProxy | External broker |
| Email provider (nodemailer/ethereal) | External SMTP |
| HTTP clients (axios) | External services |
| **DO NOT mock** domain entities | They are pure TypeScript — test them for real |
| **DO NOT mock** use case logic | The use case IS what you're testing |

### Creating mocks

```typescript
const mockRepository: jest.Mocked<PatientRepository> = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
};

const mockEventPublisher: jest.Mocked<EventPublisher> = {
  publish: jest.fn(),
};
```

### Inject via constructor (never use NestJS DI in unit tests)

```typescript
const useCase = new CreatePatientUseCase(mockRepository, mockEventPublisher);
```

---

## Coverage Requirements

Cover ALL of the following in each use case test file:

- **Happy path:** normal execution with valid input
- **Not found:** when repository returns null/undefined
- **Validation edge cases:** empty strings, null UUIDs, past dates, duplicates
- **Event publishing:** verify `publish` was called with correct routing key and payload
- **Error propagation:** when repository throws, the use case re-throws correctly

---

## E2e Test Template

```typescript
describe('PatientsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(PatientOrmEntity))
      .useValue(mockTypeOrmRepository)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(() => app.close());

  it('POST /patients → 201', async () => {
    return request(app.getHttpServer())
      .post('/patients')
      .send({ firstName: 'John', ... })
      .expect(201)
      .expect(res => {
        expect(res.body.id).toBeDefined();
        expect(res.body.email).toBe('john@email.com');
      });
  });
});
```

---

## Gherkin → Jest Mapping

When implementing a feature with a Gherkin spec in `specs/features/`, map scenarios to tests:

```gherkin
Scenario: Successfully register a new patient
  Given I have valid patient data
  When I send a POST request to "/patients"
  Then the response status should be 201
  And a "event.patient.registered" event should be published
```

Maps to:

```typescript
it('should create a patient and publish event.patient.registered', async () => {
  // Arrange — valid patient data
  // Act — call use case
  // Assert — 201 + event published
});
```

---

## FIRST Principles Checklist

- [ ] **F**ast — each unit test runs in < 50ms (no real DB/network)
- [ ] **I**ndependent — no shared mutable state between `it()` blocks
- [ ] **R**epeatable — same result every run, no time/random dependencies
- [ ] **S**elf-validating — `expect()` assertions, no manual inspection needed
- [ ] **T**imely — tests written before or alongside the implementation (not after)
