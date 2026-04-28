import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClerkJwtGuard } from './clerk-jwt.guard';
import { RoleGuard } from './role.guard';
import { UsersModule } from '../users/users.module';
import { UserEntity } from '../users/entities/user.entity';

/**
 * Authentication module — MOD-AUT-001.
 *
 * Provides Clerk JWT validation, role-based access control guards, and the
 * {@link AuthService} that bridges verified identities to platform profiles.
 *
 * @author TutorConnect Team
 */
@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([UserEntity])],
  controllers: [AuthController],
  providers: [AuthService, ClerkJwtGuard, RoleGuard],
  exports: [AuthService, ClerkJwtGuard, RoleGuard],
})
export class AuthModule {}
