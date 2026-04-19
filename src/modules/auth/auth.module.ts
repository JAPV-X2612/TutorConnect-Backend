import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClerkJwtGuard } from './clerk-jwt.guard';
import { RoleGuard } from './role.guard';
import { UsersModule } from '../users/users.module';

/**
 * Authentication module — MOD-AUT-001.
 *
 * Provides Clerk JWT validation, role-based access control guards, and the
 * {@link AuthService} that bridges verified identities to platform profiles.
 *
 * @author TutorConnect Team
 */
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, ClerkJwtGuard, RoleGuard],
  exports: [AuthService, ClerkJwtGuard, RoleGuard],
})
export class AuthModule {}
