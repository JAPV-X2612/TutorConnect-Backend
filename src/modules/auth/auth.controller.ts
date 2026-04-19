import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { ClerkJwtGuard } from './clerk-jwt.guard';
import { UserDto } from '../users/dtos/user.dto';
import { UserRole } from '../../common/enums/user-role.enum';

/** Typed shape of the authenticated user attached by {@link ClerkJwtGuard}. */
interface AuthenticatedRequest extends Request {
  user: { clerk_id: string; role: UserRole };
}

/**
 * REST controller for authentication endpoints (MOD-AUT-001).
 *
 * @author TutorConnect Team
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Returns the serialized platform profile of the currently authenticated user.
   *
   * Sensitive internal fields (password, deletedAt) are excluded via
   * {@link UserDto} serialization.
   *
   * @param req - Express request enriched by {@link ClerkJwtGuard}.
   * @returns Serialized {@link UserDto}.
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard)
  @ApiOperation({ summary: 'Get the profile of the authenticated user' })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 401, description: 'Invalid or missing JWT.' })
  async getMe(@Req() req: AuthenticatedRequest): Promise<UserDto> {
    const entity = await this.authService.getProfile(req.user.clerk_id);
    return plainToInstance(UserDto, entity, { excludeExtraneousValues: true });
  }
}
