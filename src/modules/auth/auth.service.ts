import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';

/**
 * Authentication service for MOD-AUT-001.
 *
 * Responsible solely for identity verification: "who is the user?".
 * Profile management ("what does the user do?") lives in {@link UsersService}.
 *
 * JWT validation is performed upstream by {@link ClerkJwtGuard} before any
 * method here is invoked; this service operates on already-verified identities.
 *
 * @author TutorConnect Team
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Validates that a Clerk subject has a corresponding local user profile.
   *
   * Called after JWT signature verification to ensure the identity is
   * registered in the platform database.
   *
   * @param clerkId - Clerk subject identifier extracted from the JWT (`sub` claim).
   * @returns The matching {@link UserEntity}.
   * @throws {UnauthorizedException} When no local profile exists for the given Clerk id.
   */
  async validateUser(clerkId: string): Promise<UserEntity> {
    this.logger.debug(`Validating user with clerk_id=${clerkId}`);
    const user = await this.usersService.findByClerkId(clerkId);
    if (!user) {
      throw new UnauthorizedException(
        'No platform profile found for this identity. Please complete registration.',
      );
    }
    return user;
  }

  /**
   * Returns the full platform profile for an authenticated Clerk identity.
   *
   * @param clerkId - Clerk subject identifier.
   * @returns The matching {@link UserEntity}.
   * @throws {UnauthorizedException} When no local profile exists.
   */
  async getProfile(clerkId: string): Promise<UserEntity> {
    return this.validateUser(clerkId);
  }
}
