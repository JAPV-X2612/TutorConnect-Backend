import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { verifyToken } from '@clerk/backend';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserEntity } from '../users/entities/user.entity';

/** Shape attached to the request object after successful JWT verification. */
export interface ClerkRequestUser {
  clerk_id: string;
  role: UserRole | null;
  sessionId: string;
}

/**
 * Guard that validates the Clerk-issued JWT Bearer token on incoming requests.
 *
 * Role is resolved from the platform database (UserEntity) rather than
 * Clerk's publicMetadata. This avoids calling clerk.users.getUser() on every
 * request (expensive Clerk API call) and eliminates the need for
 * updateUserMetadata(), which triggered user.updated webhooks that caused
 * "invalid state" alerts in the Expo Clerk SDK.
 *
 * @author TutorConnect Team
 */
@Injectable()
export class ClerkJwtGuard implements CanActivate {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header with Bearer token is required',
      );
    }

    const token = authHeader.slice(7);

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      const clerkId = payload.sub;

      // Read role from our database — faster than calling Clerk API and
      // avoids the updateUserMetadata → user.updated → SDK "invalid state" cycle.
      const user = await this.userRepository.findOne({ where: { clerkId } });
      const resolvedRole = (user?.role as UserRole) ?? null;

      (request as Request & { user: ClerkRequestUser }).user = {
        clerk_id: clerkId,
        sessionId: payload.sid,
        role: resolvedRole,
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
      throw new UnauthorizedException(
        'Token is invalid or could not be verified',
      );
    }
  }
}
