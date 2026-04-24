import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { DashboardService } from './dashboard.service';
import { TutorDashboardResponseDto } from './dto/tutor-dashboard.dto';
import { ClerkJwtGuard } from '../auth/clerk-jwt.guard';
import { RoleGuard } from '../auth/role.guard';
import { Roles } from '../auth/role.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

interface AuthRequest extends Request {
  user: { clerk_id: string; role: UserRole | null; sessionId: string };
}

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Returns the tutor's monthly metrics and upcoming sessions.
   * The clerk_id is extracted exclusively from the validated JWT — never from
   * query params — so a tutor can only see their own data (HU-07).
   */
  @Get('tutor')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ClerkJwtGuard, RoleGuard)
  @Roles(UserRole.TUTOR)
  @ApiOperation({ summary: 'Get the authenticated tutor\'s monthly metrics and upcoming sessions (HU-07)' })
  @ApiResponse({ status: 200, type: TutorDashboardResponseDto, description: 'Current-month metrics and next 5 scheduled sessions.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({ status: 403, description: 'Access denied. TUTOR role required.' })
  async getTutorDashboard(@Req() req: AuthRequest): Promise<TutorDashboardResponseDto> {
    return this.dashboardService.getTutorDashboard(req.user.clerk_id);
  }
}
