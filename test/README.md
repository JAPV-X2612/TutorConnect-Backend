# E2E Tests — TutorConnect Backend

## Test coverage

### Users

- Create user → 201
- Get user by ID → 200
- Get non-existent user → 404
- Update user → 200
- Update non-existent user → 404
- Delete user → 204
- Invalid email validation → 400
- List all users → 200

### Tutors

- Create tutor profile → 201
- Create tutor with non-existent user → 404
- Create tutor with invalid UUID → 400
- Get tutor by ID → 200
- Get non-existent tutor → 404
- Update tutor → 200
- Update non-existent tutor → 404
- Delete tutor → 204
- List all tutors → 200

### Bookings

- Create booking → 201
- Create booking with non-existent student → 404
- Create booking with non-existent tutor → 404
- Create booking with invalid date → 400
- Get booking by ID → 200
- Get non-existent booking → 404
- Update booking → 200
- Update non-existent booking → 404
- Delete booking → 204
- List all bookings → 200

---

## Running the tests

**1. Start the database:**

```bash
npm run docker:dev
```

**2. Create `.env.test` in the project root:**

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=tutorconnect
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres123
PORT=3001
NODE_ENV=test
```

**3. Run:**

```bash
npm run test:e2e
```

---

## File structure

```
test/
  users.e2e-spec.ts
  tutors.e2e-spec.ts
  bookings.e2e-spec.ts
  jest-e2e.json
```

---

## Troubleshooting

**`password authentication failed`** — check credentials in `.env.test` match the running database.

**`relation does not exist`** — tables not created yet. Run `npm run migration:run -- -d src/data-source.ts` before the tests.

**`timeout`** — PostgreSQL is still starting up. Wait a few seconds and retry.
