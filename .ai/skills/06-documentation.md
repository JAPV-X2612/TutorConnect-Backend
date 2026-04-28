---
name: documentation
description: Rules for writing JSDoc, README, and Markdown files in this project
triggers: [docs, documentation, README, JSDoc, comment, Markdown, explain]
applies_to: [all]
---

# Documentation Skill

## JSDoc Rules

### Required header (every exported class, interface, service, controller, DTO)

```typescript
/**
 * Brief, single-sentence description of the class or interface.
 *
 * @author Camilo Quintero, Jesús Pinzón, Laura Rodríguez, Santiago Díaz, Sergio Bejarano
 * @version 1.0
 * @since YYYY-MM-DD
 */
```

- `@since` uses the date the file was first created (`YYYY-MM-DD`)
- Public service methods get a concise `/** ... */` one-liner
- Private methods get JSDoc only if the WHY is non-obvious
- Do NOT write multi-paragraph JSDoc that explains what the code does

### Service methods

```typescript
export class DashboardService {
  /** Returns aggregated monthly metrics and upcoming sessions for the given tutor. */
  getTutorDashboard(clerkId: string): Promise<TutorDashboardDto> { ... }

  /** Returns null when clerkId does not match any active tutor. */
  findTutorByClerkId(clerkId: string): Promise<UserEntity | null> { ... }
}
```

---

## Markdown Rules (for README and docs)

### Structure

```markdown
# 🏷️ Title (H1 — one per file)

Brief description paragraph.

## 📋 Section (H2 — major sections)

### Subsection (H3)

#### Detail (H4 — use sparingly)
```

### Formatting

| Element | Convention |
|---|---|
| Key technologies | **bold** |
| Foreign words / tech names | *italic* |
| Commands / code / paths | `backtick` |
| Code blocks | ` ```language ` (always specify language) |
| Important data/values | Use tables instead of prose |

### Images

```html
<img src="assets/images/1-architecture-diagram.png" alt="Architecture Diagram" width="70%">
```

### Hyperlinks

```markdown
[NestJS Documentation](https://docs.nestjs.com/)
```

### Tables

Use tables for comparisons, config values, and multi-column lists.
Avoid tables for simple lists (use bullet points instead).

---

## README Sections (project standard)

Every service README should have:

1. **Title** + brief description + badges
2. **Table of Contents**
3. **About** — what problem it solves
4. **Architecture** — diagram + layer description
5. **Tech Stack** — table
6. **Getting Started** — prerequisites, install, run
7. **API Reference** — endpoints with request/response examples
8. **Testing** — how to run + screenshots
9. **CI/CD & Deployment** — pipeline + screenshots
10. **Authors** — table with GitHub profile photos
11. **License** — Apache 2.0 reference
12. **Additional Resources** — curated links

---

## Inline Comments

Write inline comments ONLY for:

```typescript
// Clerk JWT TTL is 60s; the SDK auto-rotates — no manual refresh needed here
const clerkId = req.user.clerkId;

// TypeScript union (string | null) causes reflect-metadata to report Object;
// explicit type: 'varchar' is required to prevent DataTypeNotSupportedError
@Column({ name: 'area_title', type: 'varchar', length: 200, nullable: true })
areaTitle: string | null;

// synchronize: true is intentionally false — use explicit migrations in all envs
synchronize: false,
```

Do NOT write:
```typescript
// Get booking by id    ← explains WHAT (obvious from the method name)
// Return the result    ← explains WHAT (obvious)
// Added for HU-07      ← belongs in git history
```

---

## .env.example Rules

- Every new environment variable must be added to `.env.example`
- Include a comment explaining non-obvious variables:

```bash
# Set to 'amqps' when using CloudAMQP or any TLS-enabled RabbitMQ instance
RABBITMQ_PROTOCOL=amqp

# For CloudAMQP Lemur: the vhost equals your username
RABBITMQ_VHOST=/
```
