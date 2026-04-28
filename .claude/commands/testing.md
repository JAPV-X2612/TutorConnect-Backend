Read `.ai/skills/02-testing.md` completely, then write or improve tests for the code I am currently working on.

1. Read the matching Gherkin file in `specs/features/` for this feature — map each scenario to a `it('should ...')` test.
2. Follow the AAA structure (Arrange / Act / Assert) for every test.
3. Use `should` / `should not` naming pattern for all `it()` blocks.
4. Mock only external dependencies (TypeORM, RabbitMQ, email, HTTP). Use real domain objects.
5. Cover: happy path, not-found, validation edge cases, event publishing, error propagation.
6. Verify the FIRST principles checklist at the end of the skill file.

Target coverage: ≥ 80% for the affected file.
