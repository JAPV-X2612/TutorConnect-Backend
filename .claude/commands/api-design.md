Read `.ai/skills/05-api-design.md` completely, then help me design or review the API endpoint I describe.

1. Verify the HTTP method and URL follow the REST conventions table in the skill.
2. Check that the correct status codes are used (201, 204, 400, 404, 409).
3. Review the request DTO: required `class-validator` decorators, correct types, `@IsUUID` on UUID fields.
4. Review the response DTO: `@Expose` / `@Exclude` applied correctly.
5. Verify the controller uses `ParseUUIDPipe` on `:id` params and specific HTTP method decorators.
6. If this is a gateway endpoint, add or verify the full set of Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiBody`, `@ApiParam`, `@ApiResponse`).
