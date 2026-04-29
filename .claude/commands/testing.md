Read `.ai/skills/02-testing.md` completely, then write or improve tests for the code I am currently working on.

1. Read the Gherkin scenarios of the related HU — map each scenario to a `it('should ...')` test.
2. Follow the AAA structure (Arrange / Act / Assert) for every test.
3. Use `should` / `should not` naming pattern for all `it()` blocks.
4. Mock only external dependencies (TypeORM repos, Redis, Pinecone, Claude API, Firebase). Never mock the service under test.
5. Cover: happy path, empty state (new user with no data), not-found, forbidden role, validation edge cases, error propagation.
6. Verify the FIRST principles checklist at the end of the skill file.

Target coverage: ≥ 80% for the affected file.
