---
name: git-workflow
description: Conventions for branches, commits, and pull requests in this project
triggers: [commit, branch, PR, pull request, merge, git, push]
applies_to: [all]
---

# Git Workflow Skill

## Branch Strategy

```
main              ← production-ready code only
  └── development ← integration branch (if used)
        └── feature/US-001-register-user
        └── feature/US-002-create-booking
        └── fix/appointment-email-confirmation
        └── chore/update-dependencies
        └── docs/improve-readme
```

**Branch naming:** `<type>/<short-description-in-kebab-case>`

| Type        | When                                     |
| ----------- | ---------------------------------------- |
| `feature/`  | New functionality from a user story      |
| `fix/`      | Bug fix                                  |
| `chore/`    | Tooling, dependencies, config            |
| `docs/`     | Documentation only                       |
| `test/`     | Tests only                               |
| `refactor/` | Code improvement with no behavior change |

---

## Commit Convention (Conventional Commits)

```
<type>(<scope>): <short imperative description>

[optional body: explain WHY, not WHAT]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### Types

| Type       | Use for                             |
| ---------- | ----------------------------------- |
| `feat`     | New feature                         |
| `fix`      | Bug fix                             |
| `test`     | Adding or correcting tests          |
| `refactor` | Code change with no behavior change |
| `docs`     | Documentation changes               |
| `chore`    | Build, tooling, dependency updates  |
| `ci`       | CI/CD pipeline changes              |
| `perf`     | Performance improvement             |

### Scopes (for this project)

`auth`, `users`, `tutors`, `bookings`, `messaging`, `dashboard`, `reviews`, `payments`, `search`, `webhooks`, `migrations`, `docker`, `ci`, `docs`

### Good commit examples

```
feat(dashboard): add GET /dashboard/tutor endpoint with monthly metrics aggregation

fix(bookings): extract clerkId from JWT instead of request body

test(dashboard): add unit tests for tutor dashboard empty state scenario

chore(migrations): generate AddReviewRatingIndex migration for calificacion_promedio query

feat(search): integrate Pinecone vector search for AI-powered tutor lookup
```

---

## Pull Request Rules

- Title: under 70 characters, imperative mood (`Add...`, `Fix...`, `Update...`)
- Every PR must pass CI (build + test + SonarCloud quality gate)
- Minimum 80% coverage must be maintained after the PR
- PRs that break existing tests will not be merged

### PR body template

```markdown
## Summary

- What changed and why (2-3 bullet points)
- Reference to User Story: HU-XX

## Test plan

- [ ] Unit tests pass (`npm run test`)
- [ ] Coverage ≥ 80% (`npm run test:cov`)
- [ ] TypeScript compiles without errors (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Manual verification with Postman or curl
- [ ] Docker Compose local environment runs correctly

## Notes

- [ ] `.env.example` updated if new environment variables were added
- [ ] TypeORM migration generated and applied if schema changed
```

---

## Safety Rules (never do without explicit confirmation)

- `git push --force` to `main`
- `git reset --hard` with uncommitted work
- `docker compose down -v` (deletes all data volumes)
- Amend a commit that is already pushed
