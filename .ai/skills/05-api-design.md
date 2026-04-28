---
name: api-design
description: REST endpoint design, DTO conventions, and Swagger documentation for this project
triggers: [API, endpoint, REST, DTO, Swagger, OpenAPI, controller, route]
applies_to: [api-gateway, all services]
---

# API Design Skill

## REST Conventions

### HTTP Methods

| Operation | Method | Path | Status |
|---|---|---|---|
| Create | `POST` | `/resource` | `201 Created` |
| Read all | `GET` | `/resource` | `200 OK` |
| Read one | `GET` | `/resource/:id` | `200 OK` |
| Full update | `PUT` | `/resource/:id` | `200 OK` |
| Partial update | `PATCH` | `/resource/:id` | `200 OK` |
| Delete | `DELETE` | `/resource/:id` | `204 No Content` |
| Action/transition | `PATCH` | `/resource/:id/action` | `200 OK` |

### Status Codes Used in This Project

| Code | Meaning |
|---|---|
| `200` | Successful read or update |
| `201` | Resource created |
| `204` | Successful deletion (empty body) |
| `400` | Validation error (class-validator) |
| `404` | Resource not found (NotFoundException) |
| `409` | Business rule conflict (ConflictException) |
| `502` | Downstream service unavailable (gateway only) |

### URL Structure

- Lowercase, kebab-case: `/appointments/:id/confirm`
- No verbs in resource names: `/patients` not `/getPatients`
- Nested for relationships: `/doctors/:id/schedules`

---

## DTO Rules

### Request DTO (`CreateXxxDto`, `UpdateXxxDto`)

```typescript
/**
 * Input DTO for the create-patient use case.
 * @authors Andrés Chavarro, ...
 * @version 1.0
 * @since YYYY-MM-DD
 */
export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsOptional()   // Only for optional fields
  @MaxLength(5)
  bloodType?: string;
}
```

**Rules:**
- Apply `class-validator` decorators only on request DTOs (not domain entities)
- `@IsOptional()` for optional fields; omit for required
- `@IsUUID()` for UUID fields
- `@IsDateString()` for ISO date fields
- `@IsEnum(SomeEnum)` for enum fields

### Response DTO (`XxxResponseDto`)

```typescript
export class PatientResponseDto {
  @Expose() id: string;
  @Expose() firstName: string;
  @Expose() email: string;
  @Exclude() internalField: string;  // Never serialized
}
```

---

## Controller Rules

```typescript
@Controller('patients')
export class PatientsController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePatientDto): Promise<PatientResponseDto> {
    return this.createPatient.execute(dto);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<PatientResponseDto> {
    return this.findPatientById.execute(id);
  }
}
```

**Rules:**
- Use `ParseUUIDPipe` on `:id` params to reject invalid UUIDs at the boundary
- Use `@HttpCode(HttpStatus.CREATED)` on `@Post` handlers
- Use `@HttpCode(HttpStatus.NO_CONTENT)` on `@Delete` handlers
- Never use `@All()` — always use specific method decorators

---

## Swagger (API Gateway only)

Every gateway endpoint must have:

```typescript
@ApiTags('patients')
@Controller()
export class PatientsProxyController {

  @Post('patients')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new patient' })
  @ApiBody({ schema: { type: 'object', required: ['firstName'], properties: { ... } } })
  @ApiResponse({ status: 201, description: 'Patient created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  create(...) { ... }
}
```

**Swagger setup in `main.ts`:**
```typescript
const config = new DocumentBuilder()
  .setTitle('MediSync API')
  .setVersion('1.0')
  .addTag('patients', 'Patient registration and management')
  .build();

SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));
```

**UI available at:** `http://localhost:3000/api`

---

## Validation Pipe (main.ts)

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // Strip unknown properties
  forbidNonWhitelisted: true,   // Throw on unknown properties
  transform: true,              // Auto-transform types (string → number, etc.)
}));
```

This is already configured. Do not remove or weaken these settings.
