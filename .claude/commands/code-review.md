Read `.ai/skills/04-code-review.md` completely, then perform a full code review of the changes I describe or the files currently open.

Work through each checklist section in order:

1. Architecture boundaries (entity duplication, clerkId extraction from JWT)
2. Code quality (naming, SOLID, functions, comments)
3. Testing (coverage, AAA, mocks, empty-state cases)
4. Security (no secrets, ConfigService, validation, no clerkId from body)
5. API / HTTP (status codes, DTOs, Swagger, guards)
6. Real-time / WebSocket (event order, Redis pub/sub, Socket.io naming)

For each finding, label it: **Must fix** (blocks merge) / **Should fix** (strongly recommended) / **Consider** (optional).

End with a summary: overall assessment and the top 3 priority items to address.
