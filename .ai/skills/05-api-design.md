---
name: api-design
description: REST endpoint design, DTO conventions, and Swagger documentation for this project
triggers: [API, endpoint, REST, DTO, Swagger, OpenAPI, controller, route]
applies_to: [all modules]
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
| `401` | Missing or invalid Clerk JWT |
| `403` | Valid JWT but insufficient role (RoleGuard) |
| `404` | Resource not found (NotFoundException) |
| `409` | Business rule conflict (ConflictException) |

### URL Structure

- Lowercase, kebab-case: `/appointments/:id/confirm`
- No verbs in resource names: `/patients` not `/getPatients`
- Nested for relationships: `/doctors/:id/schedules`

---

## DTO Rules

### Request DTO (`CreateXxxDto`, `UpdateXxxDto`)

```typescript
/**
 * Input DTO for creating a new booking.
 *
 * @author Camilo Quintero, Jesús Pinzón, Laura Rodríguez, Santiago Díaz, Sergio Bejarano
 * @version 1.0
 * @since YYYY-MM-DD
 */
export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @IsDateString()
  startTime: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
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
export class UserResponseDto {
  @Expose() id: string;
  @Expose() firstName: string;
  @Expose() email: string;
  @Exclude() internalField: string;  // Never serialized
}
```

---

## Controller Rules

```typescript
@Controller('bookings')
@UseGuards(ClerkJwtGuard)
export class BookingsController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBookingDto, @Req() req: Request): Promise<BookingDto> {
    const clerkId = req.user.clerkId; // Always from JWT — never from body
    return this.bookingsService.create(clerkId, dto);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<BookingDto> {
    return this.bookingsService.findById(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Promise<void> {
    return this.bookingsService.cancel(id, req.user.clerkId);
  }
}
```

**Rules:**
- Use `ParseUUIDPipe` on `:id` params to reject invalid UUIDs at the boundary
- Use `@HttpCode(HttpStatus.CREATED)` on `@Post` handlers
- Use `@HttpCode(HttpStatus.NO_CONTENT)` on `@Delete` handlers
- Never use `@All()` — always use specific method decorators
- `clerkId` is ALWAYS extracted from `req.user.clerkId` — never from body, query, or path

---

## Swagger (Swagger UI at `/api`)

```typescript
@ApiTags('bookings')
@Controller('bookings')
@UseGuards(ClerkJwtGuard)
export class BookingsController {

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiBearerAuth()
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({ status: 201, description: 'Booking created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Clerk JWT.' })
  @ApiResponse({ status: 403, description: 'Insufficient role.' })
  create(...) { ... }
}
```

**Swagger setup in `main.ts`:**
```typescript
const config = new DocumentBuilder()
  .setTitle('TutorConnect API')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('auth', 'Authentication and session management')
  .addTag('users', 'User profile management')
  .addTag('tutors', 'Tutor profiles, courses and certifications')
  .addTag('bookings', 'Session booking lifecycle')
  .addTag('messaging', 'Real-time chat channels')
  .addTag('dashboard', 'Tutor and learner dashboards')
  .addTag('reviews', 'Session reviews and ratings')
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
