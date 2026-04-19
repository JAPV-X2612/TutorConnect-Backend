import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';

export { UserRole as Role };

export const ROLES_KEY = 'roles';

/**
 * Decorator that restricts a route to users holding one of the specified roles.
 *
 * Must be combined with {@link RoleGuard} to take effect.
 *
 * @example
 * ```typescript
 * \@Roles(UserRole.TUTOR)
 * \@UseGuards(ClerkJwtGuard, RoleGuard)
 * getTutorDashboard() { ... }
 * ```
 *
 * @param roles - One or more {@link UserRole} values that are permitted.
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
