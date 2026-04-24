import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from './role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClerkRequestUser } from './clerk-jwt.guard';

/**
 * Guard that enforces role-based access control on protected routes.
 *
 * Reads the roles registered via the {@link Roles} decorator and compares
 * them against the `role` claim attached to `request.user` by
 * {@link ClerkJwtGuard}. Must always be used after {@link ClerkJwtGuard}.
 *
 * @author TutorConnect Team
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Checks whether the authenticated user holds at least one of the required roles.
   *
   * @param context - NestJS execution context.
   * @returns `true` when the user role satisfies the restriction.
   * @throws {ForbiddenException} When the user lacks the required role.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user: ClerkRequestUser }>();
    const userRole = request.user?.role;

    const hasRole = requiredRoles.some((role) => userRole === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
