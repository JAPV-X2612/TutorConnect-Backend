import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { verifyToken } from '@clerk/backend';
import { UserRole } from '../../common/enums/user-role.enum';

/** Shape attached to the request object after successful JWT verification. */
export interface ClerkRequestUser {
  clerk_id: string;
  role: UserRole | null;
  sessionId: string;
}

/**
 * Guard that validates the Clerk-issued JWT Bearer token on incoming requests.
 *
 * On success it enriches `request.user` with {@link ClerkRequestUser} so that
 * downstream handlers and guards can access the authenticated identity without
 * re-parsing the token.
 *
 * @author TutorConnect Team
 */
@Injectable()
export class ClerkJwtGuard implements CanActivate {
  /**
   * Validates the Bearer token extracted from the Authorization header.
   *
   * @param context - NestJS execution context providing access to the HTTP request.
   * @returns `true` when the token is valid; throws otherwise.
   * @throws {UnauthorizedException} When the header is missing, the token is
   *   expired, or the signature cannot be verified.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header with Bearer token is required');
    }

    const token = authHeader.slice(7);

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      (request as Request & { user: ClerkRequestUser }).user = {
        clerk_id: payload.sub,
        sessionId: payload.sid,
        role: (payload['role'] as UserRole) ?? null,
      };

      return true;
    } catch (error: unknown) {
      const err = error as { reason?: string; message?: string };
      const message = err?.message ?? '';

      if (
        err?.reason === 'token-expired' ||
        message.toLowerCase().includes('expir')
      ) {
        throw new UnauthorizedException('Token has expired');
      }
      throw new UnauthorizedException('Token is invalid or could not be verified');
    }
  }
}
