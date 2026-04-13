import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClerkJwtGuard } from './clerk-jwt.guard';
import { RoleGuard } from './role.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, ClerkJwtGuard, RoleGuard],
  exports: [ClerkJwtGuard, RoleGuard],
})
export class AuthModule {}
